var chalk = require('chalk');

module.exports = function log(msg, color) {
  var date = new Date().toLocaleTimeString('en-US').slice(0, 8);
  var coloredDate = color ? chalk[color](date) : date;
  console.log(coloredDate, msg);
}
