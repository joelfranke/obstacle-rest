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

var app = express();
const port = process.env.PORT;

app.use(bodyParser.json());

// Endpoint for POSTing results from tracker app
// 404 code for bad bibNo not working
app.post('/post-result', (req, res) => {

Participant.findOne({bibNo: req.body.bibNo}).then((participant) => {
  var id = participant.id;
  var isDavid = participant.isDavid;
  var firstName = participant.firstName;

  if (!participant) {
    console.log('Invalid bib number.');
    return res.status(404).send();
  } else {
    //start of duplicate prevention block
    eventResults.findOne({bibNo: req.body.bibNo, obstID: req.body.obstID}).then((duplicate) => {
      if (duplicate) {
        console.log(duplicate);
        console.log('This result has already been recorded. Contact mission control if the result is incorrect.');
        return res.status(409).send();
      } else {
        var obstResults = new eventResults({
          bibNo: req.body.bibNo,
          obstID: req.body.obstID,
          tier: req.body.tier,
          success: req.body.success
        });
        obstResults.save().then((doc) => {
          // would be nice to include the participant data here.
          console.log(firstName);
          res.send(doc);
        }, (e) => {
          res.status(400).send(e);
          console.log(e);
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
  res.status(400).send(e);
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
      return res.status(404).send();
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
      return res.status(404).send();
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

app.listen(port, () => {
  console.log(`API running on port: ${port}`);
});

module.exports = {app};
