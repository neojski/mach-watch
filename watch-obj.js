var colors = require('colors');
var path = require('path');
var watch = require('watch');
var generateDeps = require('./generateDepsFromObj.js');
var exec = require('child_process').exec;

// Usage:
// node watch-obj.js directory-to-watch firefox-obj-dir mach-command

function log(msg, color) {
  color = color || 'black';
  var date = new Date();
  console.log(date.toLocaleTimeString('en-US').slice(0, 8) + ' ' + msg[color]);
}

// TODO: Use arguments, configs
var baseDir = path.resolve(process.cwd(), process.argv[2]);
var objDir = path.resolve(process.cwd(), process.argv[3]);
var machComand = path.resolve(process.cwd(), process.argv[4]);

log('Starting deps traversal.');
var depsPromise = generateDeps(objDir, baseDir);
depsPromise.then(function (deps) {
  startWatching(deps);
}, function (reason) {
  log('Building deps failed: ' + reason, 'red');
});

function isInObj(f) {
  return (f.slice(0, objDir.length) === objDir);
}

function startWatching(deps) {
  log('Deps built. Watching ' + baseDir + '.', 'green');
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