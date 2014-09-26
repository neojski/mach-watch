var async = require('async');
var colors = require('colors');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var Promise = require('promise');
var readline = require('readline');


function preprocess(baseDir) {
  return new Promise(function (resolve) {
    info('Processing: ' + baseDir);
    glob(baseDir + '/**', function (err, files) {
      async.eachLimit(files, 20, processDeps, function () {
        resolve({
          find: findTerminals
        });
      });
    });
  });
}

var graph = {};
var terminals = {};

function isTerminal(u) {
  return terminals[u];
}

// Edge from -> to means that to build file from we have to build file to.
// If terminal then to can be build with mach.
function edge(from, to, terminal, desc) {
  console.log(from + ' -> ' + to + ' (' + desc + ')');

  if (terminal) {
    terminals[to] = true;
  }
  graph[from] = graph[from] || [];
  graph[from].push(to);
}

function findTerminals(from) {

  var terminals = {}; // It would be easier to use map...
  var vis = {};
  function dfs(u) {
    if (vis[u]) {
      return;
    }
    vis[u] = true;

    if (isTerminal(u)) {
      terminals[u] = true;
    }

    if (!graph[u]) {
      return;
    }
    for (var i = 0; i < graph[u].length; i++) {
      var v = graph[u][i];
      dfs(v);
    }
  }
  dfs(from);
  var res = [];
  for (var i in terminals) {
    res.push(i);
  }
  return res;
}

function info(msg) {
  console.log(msg.green);
}

function debug(msg) {
  console.log('<debug>'.red);
  console.log(msg);
  console.log('</ebug>'.red);
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
    edge(includedFilePath, file, false, '#include');
  }
});


var processMozBuild = lineProcessor(function (file, line, lineNumber) {
  if (lineNumber === 0) {
    info('Analyzing moz.build: ' + file);
  }
  // This is a very rough guess to match lines like:
  //    'some_module.js',
  var m = line.match(/^\s*'([^']+\.\w+)',?/);
  if (!m) {
    return;
  }
  var includedFileName = m[1];
  if (!includedFileName) {
    return;
  }
  var includedFilePath = path.join(path.dirname(file), includedFileName);
  edge(includedFilePath, path.dirname(file), true, 'moz.build');
});

var processJar = lineProcessor(function (file, line, lineNumber) {
  if (lineNumber === 0) {
    info('Analyzing jar.mn: ' + file);
  }
  // This is a very rough guess...
  // *+    whatever1    (whatever2)
  // TODO: Second case - no whatever2 (see: /toolkit/content/jar.mn)
  var m = line.match(/^\s*[*+]{0,2}\s*\S+\s+\(([^)]+)\)\s*$/);
  if (!m) {
    return;
  }
  var includedFileName = m[1];
  if (!includedFileName) {
    return;
  }
  var includedFilePath = path.join(path.dirname(file), includedFileName);
  edge(includedFilePath, path.dirname(file), true, 'jar.mn');
});

module.exports = preprocess;
