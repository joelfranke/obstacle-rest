// Entry point for starting the Express app.
// `src/app.js` contains the legacy server wiring (middleware, routes, and `app.listen`).
const {app} = require('./app');

module.exports = {app};

