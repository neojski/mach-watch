var glob = require('glob');
var fs = require('fs');
var path = require('path');
var Promise = require('promise');

var dirsWithMakefile = {};

// baseDir is a Mozilla object folder
function preprocess(objDir, baseDir) {
  return new Promise(function (resolve, reject) {
    glob(objDir + '/**/Makefile', function (err, files) {
      if (err) {
        return reject(err);
      }
      files.forEach(function (dirWithMakefile) {
        var stripMakefile = dirWithMakefile.slice(0, -9);
        var relative = path.relative(objDir, stripMakefile);
        dirsWithMakefile[relative] = true;
      });
      resolve({
        find: function (fileAbs) {
          var file = path.relative(baseDir, fileAbs);
          while (file !== path.dirname(file) && !dirsWithMakefile[file]) {
            file = path.dirname(file);
          }
          if (dirsWithMakefile[file]) {
            return path.join(baseDir, file);
          } else {
            return null;
          }
        },
        length: Object.keys(dirsWithMakefile).length
      });
    });
  });
}

module.exports = preprocess;
