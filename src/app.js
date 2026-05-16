//require general use functions
require('./config/config');
//end general use functions

// required packages
const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const path = require('path');
const compression = require('compression');
let timeDate = require('date-and-time');
//end required packages


//db models
var {mongoose} = require('./db/mongoose');
var {Participant} = require('./models/participant');
var {eventResults} = require('./models/eventresults');
var {obstacles} = require('./models/obstacles');
var {team} = require('./models/teamTable');
var {counters} = require('./models/counters');
var {dupeResults} = require('./models/duplicateresults');
var {Scoring} = require('./models/scoring');
var {teamScoring} = require('./models/teamscoring');
//var {heats} = require('./models/heats');

//end db models

//error messages
var status404  = ({message: "Check request and try again."});
var invalidToken = ({message: "Invalid or missing token."});
//end general error messages

// Services (structure-only refactor; preserve legacy logic).
const createScoringService = require('./services/scoringService');
const createAuthService = require('./services/authService');
const createEventService = require('./services/eventService');
const createTimingService = require('./services/timingService');
const createRegistrationService = require('./services/registrationService');

var scoringService = createScoringService({
  obstacles,
  Participant,
  Scoring,
  teamScoring,
  eventResults,
});
var { countObstacles, updateTeamScore, updateScore } = scoringService;

var authService = createAuthService({
  counters,
});
var { checkAuth, getNextSequence, getPerson } = authService;

var eventService = createEventService({
  Participant,
  eventResults,
  dupeResults,
  timeDate,
  updateScore,
  getNextSequence,
});
var { logEvent } = eventService;

var timingService = createTimingService({
  Participant,
  timeDate,
  updateScore,
});
var { logTime } = timingService;

var registrationService = createRegistrationService({
  Participant,
});
var { registration } = registrationService;

var app = express();

const port = process.env.PORT;

app.use(bodyParser.json());

// required to avoid cross origin scripting issues
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
//

// use compression
app.use(compression());
//


// Register legacy route handlers in a separate module (structure-only refactor).
const registerLegacyRoutes = require('./routes/legacyRoutes');
registerLegacyRoutes(app, {
  timeDate,
  Participant,
  eventResults,
  obstacles,
  team,
  Scoring,
  teamScoring,
  dupeResults,
  status404,
  invalidToken,
  checkAuth,
  updateScore,
  getPerson,
  logEvent,
  logTime,
  registration,
});

// Real-time scoring dashboard (before static so /scoring/realtime is not shadowed)
app.get('/scoring/realtime', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'server', 'reporting', 'scoring', 'realtime', 'index.html'));
});

// Binds the root directory to display html results page
app.use('/', express.static(path.join(__dirname, '..', 'server', 'reporting')))

// Binds the root directory to display html individual results page
app.use('/individual', express.static(path.join(__dirname, '..', 'server', 'individual')))

// Binds the root directory to display html admin page
app.use('/admin', express.static(path.join(__dirname, '..', 'server', 'admin')))

// Binds the root directory to display html admin page
app.use('/update-reg', express.static(path.join(__dirname, '..', 'server', 'registrationupdate')))

// Binds the root directory to display html admin page
app.use('/scoringadmin', express.static(path.join(__dirname, '..', 'server', 'scoringadmin')))

// Binds the root directory to display html admin page
app.use('/update-score', express.static(path.join(__dirname, '..', 'server', 'scoringupdate')))

// Binds the root directory to display html admin page
app.use('/update-group', express.static(path.join(__dirname, '..', 'server', 'groupupdate')))



app.listen(port, () => {
  console.log(`API running on port: ${port}`);
	countObstacles();
	console.log(Date.now());
});



module.exports = {app};
