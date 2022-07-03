const fs = require('fs');
const path = require('path');

const getFilesRecursively = (dirPath, options) => {
  const {
    fileTypes = [],
  } = options;

  const walkTree = (dir) => {
    let files = [];

    fs
      .readdirSync(dir, { withFileTypes: true })
      .forEach((entity) => {
        const _path = path.resolve(dir, entity.name);

        if (entity.isDirectory()) {
          files = files.concat(walkTree(_path));
          return;
        }

        if (fileTypes.length > 0 && !fileTypes.includes(path.extname(_path))) {
          return;
        }

        files.push(_path);
      });

    return files;
  };

  return walkTree(dirPath);
};

module.exports = {
  getFilesRecursively,
};
