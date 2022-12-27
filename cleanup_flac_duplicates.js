const fs = require('fs');
const path = require('path');
const async = require('async');
const { exec } = require('child_process');

const args = process.argv.slice(2);
let pathToRead = path.resolve(args[0]);

if (!pathToRead) {
  console.error('No folder path provided! Shutting down.');
  process.exit(1);
}

const files = fs.readdirSync(pathToRead);

// const moveFile = ({
//   fileName,
//   artist,
//   title,
//   extension,
//   callback,
// }) => {
//   console.log(path.join(pathToRead, fileName));
//   console.log('Artist:', artist);
//   console.log('Title:', title);

//   if (!artist || !title) {
//     console.log(artist, title);
//     return callback();
//   }

//   artist = artist.replace('/', ':');
//   title = title.replace('/', ':');

//   let updatedFileName = `${artist} - ${title}${extension}`;

//   if (title.startsWith(artist)) {
//     updatedFileName = `${title}${extension}`;
//   }

//   if (fileName === updatedFileName) {
//     console.log('Already in correct filename formatting. Skipping...\n');
//     return callback();
//   }

//   // remove any language specific accents
//   updatedFileName = updatedFileName.normalize("NFD").replace(/\p{Diacritic}/gu, "")

//   fs.renameSync(path.join(pathToRead, fileName), path.join(pathToRead, updatedFileName));

//   console.log(`Renamed ${fileName} to ${updatedFileName}\n`);
//   callback();
// };

const methodsToRun = files.map((fileName) => (callback) => {
  const extension = path.extname(fileName);

  if (extension !== '.flac') {
    return callback();
  }

  const name = path.parse(fileName).name;
  const wavFileName = `${name}.wav`;

  if (fs.existsSync(path.join(pathToRead, wavFileName))) {
    console.log(`${name} has both flac and wav.`);

    const currentFolderName = pathToRead.split('/').pop();
    const parentFolder = path.join(pathToRead, '..');
    const destinationPath = path.join(parentFolder, `${currentFolderName} FLAC`);

    if (!fs.existsSync(destinationPath)) {
      console.log('>>> Made directory.');
      fs.mkdirSync(destinationPath, { recursive: true });
    }

    exec(`mv "${path.join(pathToRead, fileName)}" "${path.join(destinationPath, fileName)}"`, (err) => {
      if (err) {
        return callback(err, { fileName });
      }

      callback(null, { fileName, skipped: false });
    });
  }
});

async.parallel(
  methodsToRun,
  (err, results) => {
    console.log('Succesfully moved all FLAC files that were converted to WAVs.');
  }
);
