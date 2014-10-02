var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;

module.exports = function(dir) {
  var watcher = new EventEmitter();

  var fswatch = spawn('fswatch', ['-0', dir]);
  var buf = '';
  fswatch.stdout.on('data', function (data) {
    buf += data.toString();

    while (buf.indexOf('\0') >= 0) {
      var file = buf.slice(0, buf.indexOf('\0'));
      watcher.emit('change', file);
      buf = buf.slice(buf.indexOf('\0') + 1);
    }
  });
  fswatch.stderr.on('data', function (data) {
    watcher.emit('error', data);
  });
  fswatch.on('close', function () {
    console.log('ended');
  });

  return watcher;
};
