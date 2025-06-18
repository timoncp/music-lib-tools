const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { exec } = require('child_process');
const async = require('async');
const { getFilesRecursively } = require('./utils');
const { fileTypeConversionMapping } = require('./config');

const args = process.argv.slice(2);
let pathToRead = path.resolve(args[0]);

if (!pathToRead) {
  console.error('No folder path provided! Shutting down.');
  process.exit(1);
}

const startTime = process.hrtime();

const fileTypesToConvert = Object.keys(fileTypeConversionMapping);
const files = getFilesRecursively(pathToRead, { fileTypes: fileTypesToConvert });

let queue;

const worker = (filePath, callback) => {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName);

  const stream = extension === '.flac' ? "bits_per_raw_sample" : "bits_per_sample";

  const probeBitDepthCmd = `ffprobe -v error -select_streams a:0 -show_entries stream=${stream} -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;

  exec(probeBitDepthCmd, (err, stdout, stderr) => {
    if (err) {
      console.error(`ffprobe error: ${err.message}`);
      return callback(err, { fileName });
    }

    const bitDepth = parseInt(stdout.trim(), 10);

    if (isNaN(bitDepth)) {
      return callback('Could not determine bit depth.', { fileName });
    }

    console.log(`Input bit depth: ${bitDepth}`);

    if (bitDepth < 16) {
      return callback('Bit depth lower than 16', { fileName });
    }

    if (bitDepth === 16 && ['.wav', '.aiff'].includes(extension)) {
      return callback(null, { fileName, skipped: true });
    }

    let aformat = "sample_rates=44100|48000";

    const isDownsampling = bitDepth > 16;

    if (isDownsampling) {
      console.log(`Bit depth is ${bitDepth} for track ${fileName}`);
      aformat += ":sample_fmts=s16:dither_method=triangular";
    }

    let newExtension = fileTypeConversionMapping[extension];

    if (isDownsampling) {
      newExtension = '_16bit' + newExtension;
    }
    const outputFile = filePath.replace(extension, newExtension);

    if (fs.existsSync(outputFile)) {
      return callback(null, { fileName, skipped: true });
    }

    exec(`ffmpeg -i "${filePath}" -af "aformat=sample_rates=44100|48000" "${outputFile}"`, (err, stdout, stderr) => {
      if (err) {
        return callback(err, { fileName });
      }

      callback(null, { fileName, skipped: false });
    });
  });
};

queue = async.queue(worker, 5);

const handleCompletedTask = (err, { fileName, skipped }) => {
  if (err) {
    console.log(chalk.red(`Error converting ${fileName}: ${err}`));
  } else if (skipped) {
    console.log(chalk.yellow(`File ${fileName} already has a converted copy. Skipping...`));
  } else {
    console.log(chalk.green(`Successfully converted ${fileName}. ${queue.length()} tasks remaining.`));
  }
};

queue.push(files, handleCompletedTask);

queue.drain(() => {
  const endTime = process.hrtime(startTime);
  console.info('Execution time: %ds %dms', endTime[0], endTime[1] / 1000000);

  console.log(chalk.magentaBright('Succesfully converted all files.'));
});

if (queue.started) {
  console.log(`Attempting to convert ${queue.length()} tracks...`);
}
