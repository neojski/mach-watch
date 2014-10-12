var Promise = require('Promise');
var log = require('./log.js');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;

var machCommand = process.env['MACH_COMMAND'] || 'mach';

/**
 * Module executing mach commands in the current directory.
 */

function promiseExec(command) {
  return new Promise(function (resolve, reject) {
    exec(command, function (error, stdout, stderr) {
      if (!error) {
        return resolve(stdout);
      }
      reject('mach: Exec `' + command + '` failed. Exit code: ' + error.code + '. Stderr: ' + stderr);
    });
  });
}

module.exports = {
  parseEnv: function (str) {
    var res = {};
    var lines = str.split('\n');
    var key;
    var value;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^.*:$/.test(line)) {
        if (key) {
          res[key] = values;
        }
        key = line.slice(0, -1);
        values = [];
      } else {
        values.push(line.replace(/^\t/, ''));
      }
    }
    res[key] = values;
    return res;
  },
  checkMach: function () {
    return promiseExec(machCommand).then(null, function() {
      log('Did you set MACH_COMMAND?', 'yellow');
    });
  },
  getEnvironment: function () {
    return promiseExec(machCommand + ' environment').then(function (stdout) {
      return this.parseEnv(stdout.toString());
    }.bind(this));
  },
  
  _filesToBuild: {},
  _buildTimeoutId: null,
  build: function(file, options) {
    var debounce = options.debounce || 0;
    this._filesToBuild[file] = true;
    clearTimeout(this._buildTimeoutId);
    this._buildTimeoutId = setTimeout(function() {
      this._machBuild(Object.keys(this._filesToBuild));
      this._filesToBuild = {};
    }.bind(this), debounce);
  },
  _machBuild: function(files, debounce) {
    var command = machCommand + ' build ' + files.map(function(file) {return '"' + file + '"'}).join(' ') + '';
    log('  Starting mach build: ' + command);
    return promiseExec(command).then(function (stdout) {
      log('  mach: Build successful!', 'green');
      log('  mach: stdout:\n' + stdout, 'green');
    });
  },
};