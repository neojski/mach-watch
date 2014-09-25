var colors = require('colors');
var fs = require('fs');
var path = require('path');
var watch = require('watch');
var generateDeps = require('./generateDepsFromObj.js');
var exec = require('child_process').exec;

process.on('uncaughtException', function(err) {
  log('UncaughtException:', 'red');
  console.log(err);
});

// Usage:
// node watch-obj.js directory-to-watch firefox-obj-dir mach-command

function log(msg, color) {
  var coloredMsg = color ? msg[color] : msg;
  var date = new Date();
  console.log(date.toLocaleTimeString('en-US').slice(0, 8) + ' ' + coloredMsg);
}

// TODO: Use arguments, configs.
var baseDir = path.resolve(process.cwd(), process.argv[2]);
var objDir = path.resolve(process.cwd(), process.argv[3]);
var machComand = path.resolve(process.cwd(), process.argv[4]);

// Naive sanity checks.
fs.stat(baseDir, function (err, res) {
  if (err) {
    return log('Base dir missing: ' + baseDir, 'red');
  }
  fs.stat(objDir, function (err, res) {
    if (err) {
      return log('Obj dir missing: ' + objDir, 'red');
    }
    fs.stat(machComand, function (err, res) {
      if (err || !res.isFile()) {
        return log('Mach command missing: ' + machComand, 'red');
      }
      start();
    });
  });
})

function start() {
  log('Starting deps traversal: ' + objDir, 'yellow');
  var depsPromise = generateDeps(objDir, baseDir);
  depsPromise.then(function (deps) {
    log('Deps built (' + deps.length + ' dirs found). Watching ' + baseDir + '.', 'green');
    startWatching(deps);
  }, function (reason) {
    log('Building deps failed: ' + reason, 'red');
  });
}

function isInObj(f) {
  return (f.slice(0, objDir.length) === objDir);
}

function startWatching(deps) {
  watch.createMonitor(baseDir, {
    'ignoreDotFiles': true
  }, function (monitor) {
    monitor.on("changed", function (f, curr, prev) {
      if (isInObj(f)) {
        return;
      }
      log('File ' + f + ' has changed', 'yellow');
      var dirToBuild = deps.find(f);
      if (dirToBuild) {
        // log('  You should build: ' + dirToBuild);
        build(dirToBuild);
      } else {
        log('  Unable to determine what to build', 'yellow');
      }
    });
  });
}

function build(file) {
  var command = machComand + ' build "' + file + '"';

  log('  Starting mach build: ' + command);
  exec(command, function (error, stdout, stderr) {
    log('  stdout:\n' + stdout);

    var stderrstr = stderr.toString();
    if (stderrstr) {
      log('  stderr:\n' + stderr);
    }
    if (error !== null) {
      log('  mach: ' + error, 'red');
    } else {
      log('  Build successful', 'green');
    }
  });
}
