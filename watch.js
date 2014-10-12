var fs = require('fs');
var path = require('path');
var generateDeps = require('./generateDepsFromObjLazy.js');
var fswatch = require('./fswatch.js');
var log = require('./log.js');
var mach = require('./mach.js');


process.on('uncaughtException', function(reason) {
  log('UncaughtException:', 'red');
  fail(reason);
});

function fail(reason) {
  log(reason, 'red');
  if (reason.stack) {
    log(reason.stack, 'red');
  }
  process.exit(1);
}

// TODO: Get rid of globals.
var mach;
var baseDir;
var objDir;

if (process.argv.length <= 2) {
  fail('npm run watch /dir/to/watch')
}

var watchDir = path.resolve(process.cwd(), process.argv[2]); // node watch.js ~/dir/to/watch
fs.stat(watchDir, function (err, res) {
  if (err) {
    return log('Watch dir missing: ' + watchDir, 'red');
  }
  process.chdir(watchDir);
  mach.checkMach().then(function() {
    return mach.getEnvironment();
  }).then(start, fail);
});

function start(env) {
  objDir = env['config topobjdir'][0];
  baseDir = env['config topsrcdir'][0];

  log('Base dir: ' + baseDir + '.', 'yellow');
  log('Obj dir: ' + objDir + '.', 'yellow');
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
      mach.build(dirToBuild, {debounce: 100});
    }, function (reason) {
      log('  Unable to determine what to build: ' + reason, 'red');
      if (reason.stack) {
        log(reason.stack);
      }
    });
  });
}
