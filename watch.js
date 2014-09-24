var colors = require('colors');
var path = require('path');
var watch = require('watch');
var generateDeps = require('./generateDeps.js');

var baseDir = path.resolve(process.cwd(), process.argv[2]); // node watch.js path, TODO: run as script

var depsPromise = generateDeps(baseDir);
depsPromise.then(function(deps) {
  startWatching(deps);
});

function info(msg) {
  console.log(msg.yellow);
}

function startWatching(deps) {
  watch.createMonitor(baseDir, function (monitor) {
    monitor.on("changed", function (f, curr, prev) {
      var filesToBuild = deps.find(f);
      info('File ' + f + ' has changed');
      console.log('  You should build: ' + filesToBuild);
    });
  });
}