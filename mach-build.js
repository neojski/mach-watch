var log = require('./log.js');
var exec = require('child_process').exec;

var machCommand;
// TODO: Make this saner
module.exports = function build(file, options) {
  machCommand = options.machCommand; // what?!
  var debounce = options.debounce || 0;
  delayedBuild(file, debounce);
};

function build(files) {
  var command = machCommand + ' build ' + files.map(function(file) {return '"' + file + '"'}).join(' ') + '';

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

var filesToBuild = {};
var buildTimeoutId;
function delayedBuild(file, debounce) {

  filesToBuild[file] = true;
  clearTimeout(buildTimeoutId);
  buildTimeoutId = setTimeout(function() {
    build(Object.keys(filesToBuild));
    filesToBuild = {};
  }, debounce);
}
