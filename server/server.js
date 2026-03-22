// Thin delegator for the legacy server.
// The actual Express app wiring lives in `src/app.js`.
const {app} = require('../src/start');

module.exports = {app};

