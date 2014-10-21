var Promise = require('Promise');
var autobuild = require('./autobuild.js');
var fs = require('fs');
var fswatch = require('./fswatch.js');
var log = require('./log.js');
var mach = require('./mach.js');
var path = require('path');

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

if (process.argv.length <= 2) {
  log('Usage: mach-watch /dir/to/watch', 'green');
  process.exit(1);
}

var watchDir = path.resolve(process.cwd(), process.argv[2]); // node watch.js ~/dir/to/watch
fs.stat(watchDir, function (err, res) {
  if (err) {
    return log('Watch dir missing: ' + watchDir, 'red');
  }
  process.chdir(watchDir);
  Promise.all([autobuild(), mach.getEnvironment()]).then(function (res) {
    startWatching(watchDir, res[0], res[1]);
  }, fail);
});

function isInObj(objDir, f) {
  return (f.slice(0, objDir.length) === objDir);
}

function isRightExt(f) {
  var ext = path.extname(f);
  return ['.js', '.jsm', '.xul', '.xml', '.css'].indexOf(ext) >= 0;
}

function startWatching(watchDir, builder, env) {
  log('Preparing files watcher.', 'yellow');
  log('Watcher started for dir: ' + watchDir + '.', 'green');
  var objDir = env['config topobjdir'][0];
  var watcher = fswatch(watchDir);
  watcher.on('change', function (f) {
    if (isInObj(objDir, f)) {
      return; // log('Ignoring ' + f + ' because it is in objdir.', 'yellow');
    }
    if (!isRightExt(f)) {
      return log('Ignoring ' + f + ' due to extension (' + path.extname(f) + ').', 'yellow');
    }
    log('File ' + f + ' has changed.', 'yellow');
    builder.build([f], {debounce: 100});
  });
}
