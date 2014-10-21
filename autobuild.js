var fs = require('fs');
var generateDeps = require('./generateDepsFromObjLazy.js');
var log = require('./log.js');
var mach = require('./mach.js');
var path = require('path');

module.exports = function() {
  return getMachEnv().then(getDeps).then(function (deps) {
    return {
      build: function(files, options) {
        files.forEach(function (f) {
          checkAndAutobuildFile(deps, path.resolve(process.cwd(), f), options);
        });
      }
    }
  }, function (reason) {
    log(reason, 'red');
  });
}

function getMachEnv() {
  return mach.checkMach().then(mach.getEnvironment.bind(mach));
}

function getDeps(env) {
  var objDir = env['config topobjdir'][0];
  var baseDir = env['config topsrcdir'][0];
  log('Base dir: ' + baseDir + '.', 'yellow');
  log('Obj dir: ' + objDir + '.', 'yellow');
  log('Preparing deps for obj dir: ' + objDir + '.', 'yellow');
  var depsPromise = generateDeps(objDir, baseDir);
  return depsPromise.then(function (deps) {
    log('Deps ready.', 'green');
    return deps;
  }).then(null, function (reason) {
    log('Building deps failed: ' + reason, 'red');
    throw reason;
  });
}

function checkAndAutobuildFile(deps, f, options) {
  fs.exists(f, function(exists) {
    if (!exists) {
      return log('  File not found: ' + f, 'red');
    }
    autobuildFile(deps, f, options);
  });
}

function autobuildFile(deps, f, options) {
  log('  Finding deps for file: ' + f, 'yellow');
  deps.find(f).then(function (dirToBuild) {
    mach.build(dirToBuild, options);
  }, function (reason) {
    log('  Unable to determine what to build: ' + reason, 'red');
    if (reason.stack) {
      log(reason.stack);
    }
  });
}
