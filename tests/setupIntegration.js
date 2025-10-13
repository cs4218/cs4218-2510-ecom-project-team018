// Polyfill TextEncoder/TextDecoder for environments where they are missing (e.g., jsdom + Node < 19)
const { TextEncoder, TextDecoder } = require("util");

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder;
}
