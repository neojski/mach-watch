var async = require('async');
var colors = require('colors');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var readline = require('readline');

var p = process.argv[2];
var file = path.resolve(process.cwd(), p);

info('Processing: ' + file);

glob(file + '/**', function (err, files) {
  async.eachLimit(files, 20, processDeps);
});

function edge(from, to, desc) {
  console.log(from + ' -> ' + to + ' (' + desc + ')');
}

function info(msg) {
  console.log(msg.green);
}

function debug(msg) {
  console.log(msg.red);
}

function error(msg) {
  console.log(msg.red);
}

function processDeps(file, callback) {

  if (file.slice(-3) === '.js') {
    processJs(file, callback);
  } else if (file.slice(-4) === '.jsm') {
    processJs(file, callback);
  } else if (file.slice(-10) === '/moz.build') {
    processMozBuild(file, callback);
  } else if (file.slice(-7) === '/jar.mn') {
    processJar(file, callback);
  } else {
    callback();
  }
}

function lineProcessor(lineProcessFun) {
  return function(file, callback) {
    var rd = readline.createInterface({
      input: fs.createReadStream(file),
      output: process.stdout,
      terminal: false
    });

    var i = 0;
    rd.on('line', function(line) {
      lineProcessFun(file, line, i++);
    });

    rd.on('close', function () {
      callback();
    });
  };
}

var processJs = lineProcessor(function (file, line) {
  if (line.indexOf('include') >= 0) {
    var m = line.match(/#include (.*)/);
    if (!m) {
      return;
    }
    var includedFileName = m[1];
    if (!includedFileName) {
      return;
    }
    var includedFilePath = path.join(path.dirname(file), includedFileName);
    edge(includedFilePath, file, '#include');
  }
});


var processMozBuild = lineProcessor(function (file, line, lineNumber) {
  if (lineNumber === 0) {
    error('TODO mozbuild: ' + file);
  }
});

var processJar = lineProcessor(function (file, line) {
  // This is a very rough guess!
  // *+    whatever    (whatever)
  var m = line.match(/^\s*[*+]{0,2}\s*\S+\s+\(([^)]+)\)\s*$/);
  if (!m) {
    return;
  }
  var includedFileName = m[1];
  if (!includedFileName) {
    return;
  }
  var includedFilePath = path.join(path.dirname(file), includedFileName);
  edge(includedFilePath, path.dirname(file), 'jar.mn');
});
