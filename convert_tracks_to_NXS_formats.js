const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { spawn } = require('child_process');
const async = require('async');
const dree = require('dree');
const args = process.argv.slice(2);

const startTime = process.hrtime();

let pathToRead = path.resolve(args[0]);

if (!pathToRead) {
  console.error('No folder path provided! Shutting down.');
  process.exit(1);
}

const fileTypeConversionMapping = {
  '.flac': '.wav',
  '.alac': '.wav',
  '.m4a': '.mp3',
  '.ogg': '.mp3',
};

const fileTypesToConvert = Object.keys(fileTypeConversionMapping);

const getFilesRecursively = (path) => {
  const files = [];
  dree.scan(path, {}, file => files.push(file.path));
  return files;
};

const files = getFilesRecursively(pathToRead);

const methodsToRun = files.map(filePath => (callback) => {
  const extension = path.extname(filePath);

  if (!fileTypesToConvert.includes(extension.toLowerCase())) {
    return callback();
  }

  const fileName = path.basename(filePath);
  const newExtension = fileTypeConversionMapping[extension];
  const outputFile = filePath.replace(extension, newExtension);
  const newFileName = fileName.replace(extension, newExtension);

  if (fs.existsSync(outputFile)) {
    console.log(chalk.yellow(`File ${newFileName} already has converted copy. Skipping...\n`));
    return callback();
  }

  console.log(`Converting ${fileName} to ${newFileName}\n`);

  const ffmpeg = spawn('ffmpeg', ['-i', filePath, outputFile]);

  ffmpeg.on('close', (code) => {
    if (code === 0) {
      console.log(chalk.green(`Successfully converted ${fileName} to ${newFileName}\n`));
    } else {
      console.log(chalk.red(`Failed to convert ${fileName} to ${newFileName}\n`));
    }
    callback();
  });
});

async.parallelLimit(
  methodsToRun,
  10,
  (err, results) => {
    const endTime = process.hrtime(startTime);
    console.info('Execution time: %ds %dms', endTime[0], endTime[1] / 1000000)

    if (err) {
      console.log(chalk.redBright(`Error in async end result callback.\n`));
      process.exit(1);
    }

    console.log(chalk.magentaBright('Succesfully converted all files.'));
    process.exit(0);
  }
);
