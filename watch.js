var colors = require('colors');
var fs = require('fs');
var path = require('path');
var generateDeps = require('./generateDepsFromObjLazy.js');
var fswatch = require('./fswatch.js');
var machBuild = require('./mach-build.js');
var log = require('./log.js');

process.on('uncaughtException', function(err) {
  log('UncaughtException:', 'red');
  console.log(err);
  if (err.stack) {
    console.log(err.stack);
  }
});

// TODO: Use arguments, configs.
var baseDir = path.resolve(process.cwd(), process.argv[2]);
var objDir = path.resolve(process.cwd(), process.argv[3]);
var watchDir = path.resolve(process.cwd(), process.argv[4]);
var machCommand = path.resolve(process.cwd(), process.argv[5]);

// Naive sanity checks.
fs.stat(baseDir, function (err, res) {
  if (err) {
    return log('Base dir missing: ' + baseDir, 'red');
  }
  fs.stat(objDir, function (err, res) {
    if (err) {
      return log('Obj dir missing: ' + objDir, 'red');
    }
    fs.stat(watchDir, function (err, res) {
      if (err) {
        return log('Watch dir missing: ' + watchDir, 'red');
      }
      fs.stat(machCommand, function (err, res) {
        if (err || !res.isFile()) {
          return log('Mach command missing: ' + machCommand, 'red');
        }
        start();
      });
    });
  });
})

function start() {
  log('Base dir: ' + baseDir + '.', 'yellow');
  log('Preparing deps for obj dir: ' + objDir + '.', 'yellow');
  var depsPromise = generateDeps(objDir, baseDir);
  depsPromise.then(function (deps) {
    log('Deps ready.', 'green');
    startWatching(deps);
  }).then(null, function (reason) {
    log('Building deps failed: ' + reason, 'red');
  });
}

function isInObj(f) {
  return (f.slice(0, objDir.length) === objDir);
}

function isRightExt(f) {
  var ext = path.extname(f);
  return ['.js', '.jsm', '.xul', '.xml', '.css'].indexOf(ext) >= 0;
}

function startWatching(deps) {
  log('Preparing files watcher.', 'yellow');
  log('Watcher started for dir: ' + watchDir + '.', 'green');

  var watcher = fswatch(watchDir);
  watcher.on('change', function (f) {
    if (isInObj(f)) {
      return;
    }
    if (!isRightExt(f)) {
      return log('Ignoring ' + f + ' due to extension (' + path.extname(f) + ')', 'yellow');
    }
    log('File ' + f + ' has changed.', 'yellow');
    deps.find(f).then(function (dirToBuild) {
      machBuild(dirToBuild, {debounce: 100, machCommand: machCommand});
    }, function (reason) {
      log('  Unable to determine what to build: ' + reason, 'red');
      if (reason.stack) {
        log(reason.stack);
      }
    });
  });
}
