// Polyfill for TextEncoder/TextDecoder in Node.js
defineGlobalTextEncoderPolyfill();
require('@testing-library/jest-dom');

function defineGlobalTextEncoderPolyfill() {
  if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = require('util').TextEncoder;
  }
  if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = require('util').TextDecoder;
  }
}

