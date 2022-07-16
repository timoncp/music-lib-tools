const fs = require('fs');
const path = require('path');
const jsmediatags = require('jsmediatags');
const nodeid3 = require('node-id3');
const async = require('async');

const args = process.argv.slice(2);
let pathToRead = path.resolve(args[0]);

if (!pathToRead) {
  console.error('No folder path provided! Shutting down.');
  process.exit(1);
}

const audioFileTypes = [
  '.wav',
  '.mp3',
  '.flac',
  '.aiff',
  '.aif',
  '.ogg',
  '.aac',
  '.m4a',
];

const files = fs.readdirSync(pathToRead);

const renameFile = ({
  fileName,
  artist,
  title,
  extension,
  callback,
}) => {
  console.log(path.join(pathToRead, fileName));
  console.log('Artist:', artist);
  console.log('Title:', title);

  if (!artist || !title) {
    console.log(artist, title);
    return callback();
  }

  artist = artist.replace('/', ':');
  title = title.replace('/', ':');

  let updatedFileName = `${artist} - ${title}${extension}`;

  if (title.startsWith(artist)) {
    updatedFileName = `${title}${extension}`;
  }

  if (fileName === updatedFileName) {
    console.log('Already in correct filename formatting. Skipping...\n');
    return callback();
  }

  // remove any language specific accents
  updatedFileName = updatedFileName.normalize("NFD").replace(/\p{Diacritic}/gu, "")

  fs.renameSync(path.join(pathToRead, fileName), path.join(pathToRead, updatedFileName));

  console.log(`Renamed ${fileName} to ${updatedFileName}\n`);
  callback();
};

const methodsToRun = files.map(fileName => (callback) => {
  const extension = path.extname(fileName);

  if (!audioFileTypes.includes(extension.toLowerCase())) {
    return callback();
  }

  jsmediatags.read(path.join(pathToRead, fileName), {
    onSuccess: (data) => {
      let {
        tags: {
          artist,
          title,
        },
      } = data;

      renameFile({
        fileName,
        artist,
        title,
        extension,
        callback,
      });
    },
    onError: (err) => {
      if (err.type === 'tagFormat') {
        nodeid3.read(path.join(pathToRead, fileName), (err, data) => {
          const {
            artist,
            title
          } = data;

          return renameFile({
            fileName,
            artist,
            title,
            extension,
            callback,
          });
        });
      }

      console.log(err);
    }
  });
});

async.parallel(
  methodsToRun,
  (err, results) => {
    console.log('Succesfully renamed all files.');
  }
);




