const fs = require('fs');
const path = require('path');
const async = require('async');
const chalk = require('chalk');
const { exec } = require('child_process');
const { getFilesRecursively } = require('./utils');
const { fileTypeConversionMapping } = require('./config');

const args = process.argv.slice(2);
let pathToRead = path.resolve(args[0]);

if (!pathToRead) {
  console.error('No folder path provided! Shutting down.');
  process.exit(1);
}

const startTime = process.hrtime();

const incompatibleFileTypes = Object.keys(fileTypeConversionMapping);
const files = getFilesRecursively(pathToRead, { fileTypes: incompatibleFileTypes });

let queue;

const worker = (filePath, callback) => {
  const fileName = path.basename(filePath);
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);
  const parentDir = path.dirname(filePath);

  if (!incompatibleFileTypes.includes(extension)) {
    return callback(null, { fileName, skipped: true });
  }

  const allowedFormatFilePath = path.join(parentDir, `${baseName}${fileTypeConversionMapping[extension]}`);

  if (!fs.existsSync(allowedFormatFilePath)) {
    return callback(null, { fileName, skipped: true });
  }

  const outputFile = filePath.replace(pathToRead, `${pathToRead} FLAC`);
  const outputFolder = path.dirname(outputFile);

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  exec(`mv "${filePath}" "${outputFile}"`, (err) => {
    if (err) {
      return callback(err, { fileName });
    }

    callback(null, { fileName });
  });
};

queue = async.queue(worker, 5);

const handleCompletedTask = (err, { fileName, skipped }) => {
  if (err) {
    console.log(chalk.red(`Error moving ${fileName}: ${err}`));
  } else if (skipped) {
    console.log(chalk.yellow(`File ${fileName} has no WAV/MP3 copy or is not of a converted type. Skipping...`));
  } else {
    console.log(chalk.green(`Moved file ${fileName}. ${queue.length()} tasks remaining.`));
  }
};

queue.push(files, handleCompletedTask);

queue.drain(() => {
  const endTime = process.hrtime(startTime);
  console.info('Execution time: %ds %dms', endTime[0], endTime[1] / 1000000);

  console.log(chalk.magentaBright('Succesfully moved all files.'));
});

if (queue.started) {
  console.log(`Checking ${queue.length()} FLAC, ALAC, m4a, ogg tracks for existing WAV/MP3 copies...`);
}
