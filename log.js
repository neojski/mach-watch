module.exports = function log(msg, color) {
  var coloredMsg = color ? msg[color] : msg;
  var date = new Date();
  console.log(date.toLocaleTimeString('en-US').slice(0, 8) + ' ' + coloredMsg);
}
