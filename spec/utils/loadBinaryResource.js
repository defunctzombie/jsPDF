const fs = require('fs');
const path = require('path');

const prefix = global.isNode ? '/../' : '/base/spec/';

function loadBinaryResource(url) {
  try {
    return fs.readFileSync((path.resolve(__dirname + prefix + url)), { encoding: 'latin1' });
  } catch (ex) {
    console.log(ex);
  }
  return '';
}

module.exports = loadBinaryResource;