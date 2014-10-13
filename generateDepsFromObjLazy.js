var Promise = require('promise');
var async = require('async');
var fs = require('fs');
var path = require('path');

function LazyDeps (objDir, baseDir) {
  this.objDir = objDir;
  this.baseDir = baseDir;

  this.cache = {};
}

LazyDeps.prototype.get = function (file) {
  return this.cache[file];
};

LazyDeps.prototype.isCached = function (file) {
  return file in this.cache;
}

LazyDeps.prototype.put = function (file, dir) {
  this.cache[file] = dir;
};

LazyDeps.prototype.find = function (file) {
  return new Promise(function (resolve, reject) {
    if (this.isCached(file)) {
      var cached = this.get(file);
      if (cached) {
        return resolve(cached);
      }
      return reject('No Makefile was found (result cached).');
    }

    var relativeFile = path.relative(this.baseDir, file);
    var candidateDirs = [];

    while (relativeFile !== path.dirname(relativeFile)) {
      candidateDirs.push(path.join(this.objDir, relativeFile));
      relativeFile = path.dirname(relativeFile);
    }

    function makefileExists (dir, callback) {
      fs.exists(path.join(dir, 'Makefile'), callback);
    }

    async.filter(candidateDirs, makefileExists, function (results) {
      var res = results[0];
      this.put(file, res);
      if (res) {
        resolve(res);
      } else {
        reject('No Makefile was found in the parent directories. I checked:\n  ' + candidateDirs.join('\n  '));
      }
    }.bind(this));
  }.bind(this));
};

// baseDir is a Mozilla object folder
function preprocess(objDir, baseDir) {
  return Promise.resolve(new LazyDeps(objDir, baseDir));
}

module.exports = preprocess;
