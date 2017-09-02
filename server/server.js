require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');

var {mongoose} = require('./db/mongoose');
var {Participant} = require('./models/participant');
var {eventResults} = require('./models/eventresults');
var {obstacle} = require('./models/obstacle');
var {team} = require('./models/teamTable');
var {counters} = require('./models/counters');

var status409  = ({message: "This result has already been recorded. Contact mission control if the result is incorrect."});
var status404  = ({message: "The Bib number you entered is not valid. Please check and try again."});
var resultsStatus404  = ({message: "The Bib number you entered is not valid or there is no result recorded for that Bib number. Please check and try again."});

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

// getNextSequence(name) {
//    var ret = counters.findAndModify(
//           {
//             query: { _id: name },
//             update: { $inc: { seq: 1 } },
//             new: true
//           }
//    );
//
//    return ret.seq;
// }

// Endpoint for POSTing results from tracker app
app.post('/post-result', (req, res) => {

Participant.findOne({bibNo: req.body.bibNo}).then((participant) => {
  var id = participant.id;
  var isDavid = participant.isDavid;
  var firstName = participant.firstName;
  var lastName = participant.lastName;

  if (!participant) {
    console.log(status404);
    return res.status(404).send(status404);
  } else {
    //start of duplicate prevention block
    eventResults.findOne({bibNo: req.body.bibNo, obstID: req.body.obstID}).then((duplicate) => {
      if (duplicate) {
        return res.status(409).send(status409);
      } else {
        var obstResults = new eventResults({
          bibNo: req.body.bibNo,
          obstID: req.body.obstID,
          tier: req.body.tier,
          success: req.body.success//,
          //ObjectId.getTimestamp()
        });
        obstResults.save().then((doc) => {
          // would be nice to include the participant data here.
          var successfulPost = ({
            message: `${firstName}`
          });
          res.send(successfulPost);
        }, (e) => {
          res.status(400).send(e);
          //console.log('the first 400 is throwing an error');
        });
              if (isDavid === true){
                 if (req.body.success === false || req.body.tier !== "G3"){
                   Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
                  console.log('Alas, failure is inevitable');
                }).catch((e) => {
                     console.log('Something went wrong.');
                   })
                 }
              }

      }
    })
    }
  }
).catch((e) => {
  res.status(404).send(status404);
});
});
//
//Complete GET ALL results
app.get('/results', (req, res) => {
  eventResults.find().then((results) => {
    res.send({results});
  }, (e) => {
    res.status(400).send(e);
  });
});



// GET results by bib number
app.get('/results/:id', (req, res) => {
  var id = req.params.id;
  eventResults.find({bibNo: id}).then((results) => {
    console.log(results.length);
    if (!results || results.length == 0) {
      console.log('Invalid bib number.');
      return res.status(404).send(resultsStatus404);
    }
    res.send({results});
  }, (e) => {
    res.status(400).send(e);
  });
});

// Full GET query of participant table
app.get('/participant', (req, res) => {
  Participant.find().then((participants) => {
    res.send({participants});
  }, (e) => {
    res.status(400).send(e);
  });
});

// GET request by bib number
app.get('/participant/:id', (req, res) => {
  var id = req.params.id;

  Participant.findOne({bibNo: id}).then((participant) => {

    if (!participant) {
      console.log('Invalid bib number.');
      return res.status(404).send(status404);
    }
    if (participant.isDavid === true){
      console.log('is david!');
      res.send({participant});
    } else {
      console.log('is not david...');
      res.send({participant});
    }
  }).catch((e) => {
    res.status(400).send(e);
  });
});

// Endpoint for POSTing new registrations to participant db
app.post('/registration', (req, res) => {
    //start of pre-registration detection. If participant is pre-registered, add bibNo. If this is an event day registration, write the full information to the db.
    Participant.findOne({lastName: req.body.lastName, firstName: req.body.firstName}).then((preregistered) => {
      if (preregistered) {
        var id = preregistered.id;
        Participant.findByIdAndUpdate(id, {bibNo: req.body.bibNo}, {new: true}).then((participant) => {
       console.log('bibNo assigned');
     }).catch((e) => {
          console.log('Something went wrong adding bibNo.');
        })
        return res.status(200).send(`${req.body.firstName} registered with bibNo: ${req.body.bibNo}.`);
      }
      else {
          console.log(`attempting to write ${req.body.email} to db`);
          var newRegistration = new Participant({
          bibNo: req.body.bibNo,
          heat: req.body.heat,
          lastName: req.body.lastName,
          firstName: req.body.firstName,
          email: req.body.email,
          teamID: req.body.teamID,
          gender: req.body.gender,
          age: req.body.age,
          isDavid: true
        });
        newRegistration.save().then((doc) => {
          var successfulPost = ({
            message: `${req.body.firstName} registered with bibNo: ${req.body.bibNo}.`
          });
          res.send(successfulPost);
        }).catch((e) => {
          console.log(e);
          res.status(400).send(e);
        });
      }
    })
.catch((e) => {
  res.status(404).send(e);
});
});


app.listen(port, () => {
  console.log(`API running on port: ${port}`);
});

module.exports = {app};
