require('./config/config');

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const path = require('path');

var {mongoose} = require('./db/mongoose');
var {Participant} = require('./models/participant');
var {eventResults} = require('./models/eventresults');
var {obstacle} = require('./models/obstacle');
var {team} = require('./models/teamTable');
var {counters} = require('./models/counters');
var {dupeResults} = require('./models/duplicateresults');

var status404  = ({message: "Check request and try again."});

var app = express();
const port = process.env.PORT;

//move this to new config file config
function getNextSequence(name) {
    var nextSeq = counters.findOneAndUpdate({_id: name}, { $inc: { seq: 1 } }).then((nextcounter) => {return nextcounter.seq
    });
    return nextSeq;
 }

app.use(bodyParser.json());

//Testing block to avoid cross origin scripting issues
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
//


// Endpoint for POSTing results from tracker app
app.post('/post-result', (req, res) => {
    var status404  = ({message: "BibNo not found.", bibNo: req.body.bibNo, obstID: req.body.obstID});
    Participant.findOne({bibNo: req.body.bibNo}).then((participant) => {
  var id = participant.id;
  var isDavid = participant.isDavid;
  var firstName = participant.firstName;
  var lastName = participant.lastName;
  var bibNo = participant.bibNo;
  var obstID = req.body.obstID;

  var successfulPost = ({
    message: `${firstName}`,
    bibNo: `${bibNo}`,
    obstID: `${obstID}`
  });

  if (!participant) {
    return res.status(404).send(status404);
  } else {

    //start of duplicate handling
    eventResults.findOne({bibNo: req.body.bibNo, obstID: req.body.obstID}).then((duplicate) => {

      var timestamp = Date.now()
      if (duplicate) {
        // testing block
        var resultDiff = (((((timestamp - duplicate._id.getTimestamp())% 86400000) % 3600000) / 60000));
        if (resultDiff <= 2) {
          //update this with the actual req.body.* fields incl timestamp
          eventResults.findByIdAndUpdate(duplicate._id, {success: req.body.success, timestamp: timestamp, tier: req.body.tier}, {new: true}).then((doc) => {
          return res.status(200).send(successfulPost);
     }).catch((e) => {
          console.log(e);
          res.status(400).send(e);
        })
      } else {
          // end testing block

                //if duplicate and greater than 2 minutes after the first recorded result, throw a 409 error but write results to a new log table anyway
                var obstResults = new dupeResults({
                  bibNo: req.body.bibNo,
                  obstID: req.body.obstID,
                  tier: req.body.tier,
                  success: req.body.success,
                  bibFromBand: req.body.bibFromBand,
                  timestamp: timestamp,
                  deviceTime: req.body.deviceTime
                });
                console.log('Duplicate logged: ' + JSON.stringify(obstResults));
                obstResults.save().then((doc) => {

                  //following function emails if duplicate result is found
                  //email(JSON.stringify(obstResults));
                  //end of email block

                  return res.status(409).send(successfulPost);
                }, (e) => {
                  console.log(e);
                  res.status(400).send(e);
                });
      }

        // end of duplicate handler
      }
      // start of new result logging
      else {

        var getSeq = getNextSequence('results');
        getSeq.then((nextSeq) => {
          var obstResults = new eventResults({
            bibNo: req.body.bibNo,
            obstID: req.body.obstID,
            tier: req.body.tier,
            success: req.body.success,
            bibFromBand: req.body.bibFromBand,
            timestamp: timestamp,
            deviceTime: req.body.deviceTime,
            resultID: nextSeq
          });
          obstResults.save().then((doc) => {
            res.send(successfulPost);
          }, (e) => {
            console.log(e);
            res.status(400).send(e);
          });
        });
              if (isDavid === true){
                 if (req.body.success === false || req.body.tier !== 3){
                   Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
                  //console.log('Alas, failure is inevitable');
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
// includes logic to send delta results based on an optional query value "q"
app.get('/results', (req, res) => {
  var delta = req.query.d
  if (delta !==undefined) {
  //console.log(delta);
  eventResults.find({ resultID: { $gt: delta } }).then((results) => {
    res.send({results});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });
  }

  else {
  eventResults.find().then((results) => {
    res.send({results});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });

  }
//end of code block
});


//start testing



app.get('/scoring', (req, res) => {
//start of code block
var scores = [];
//get unique bib numbers with at least one event result
eventResults.distinct("bibNo").then((event) => {
  var uniqueBib = event.length;
  for(var bib in event){
    var bibNo = event[bib];
    //get people metadata
    Participant.findOne({bibNo: bibNo}).then((participant) => {
      var personBib = participant.bibNo
      var isDavid = participant.isDavid;
      var firstName = participant.firstName;
      var lastName = participant.lastName;
      var teamName = participant.teamID;


      if (isDavid == true){
        var participantName = "<a href='/individual/?id=" +personBib+"'>" + lastName + ', ' + firstName+"</a>*";
        } else {
          var participantName = "<a href='/individual/?id=" +personBib+"'>" + lastName + ', ' + firstName+"</a>";
        }

        eventResults.find({bibNo: personBib}).then((events) => {
          var g1 = 0;
          var g2 = 0;
          var g3 = 0;
          var totScore = 0;
          var totEvents = 0
          for(var event in events){
            var success = events[event].success;
            var tier = events[event].tier;
            if (success == true){
              if (tier ==1){
                g1 = g1 + 1;
              }
              if (tier == 2){
                g2 = g2 + 1;
              }
              if (tier == 3){
                g3 = g3 + 1;
              }
              totEvents = totEvents + 1
            } else {
              totEvents = totEvents + 1
            }
          }

          totScore = (g1*1.000001) + (g2*3.0001) + (g3*5.01);
          if (totEvents == 12) {
            totEvents = 'Course Complete';
          } else {
            totEvents = totEvents + '/12';
          }
          var score = {
            person: participantName,
            bibNo: personBib,
            teamID: teamName,
            g1:g1,
            g2:g2,
            g3:g3,
            score:totScore,
            progress:totEvents
          }
          scores.push(score);
          var uniqueScores=scores.length
          if (uniqueScores == uniqueBib){
            res.send(scores);
          }
          //console.log(uniqueBib,uniqueScores);
        }, (e) => {
          res.status(400).send(e);
        }); //console.log(scores);
    });
  }

  //end of scoring
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    // original code
  });


//end of code block
});




//END TEST


// GET results by bib number
app.get('/results/:id', (req, res) => {

  var id = req.params.id;
  eventResults.find({bibNo: id}).then((results) => {
    //console.log(results.length);
    if (!results || results.length == 0) {
      //console.log('Invalid bib number.');
      return res.status(404).send(status404);
    }
    res.send({results});
  }, (e) => {
    res.status(400).send(e);
  });
});

// Full GET query of participant table
app.get('/participant', (req, res) => {
	var getList;
	//var qFirstName = req.query.firstName;
	var qLastName = req.query.lastName;
  var birth = req.query.bday;

	if (qLastName !==undefined){
      getList = Participant.find({ lastName: qLastName  }).collation( { locale: 'en', strength: 2 } );
	} else if (birth !==undefined){
      getList = Participant.find({ birthdate: birth  });
	}
  else {
		getList = Participant.find();
	}
	getList.then((participants) => {
	// original find request below
	//Participant.find().then((participants) => {
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
      //console.log('Invalid bib number.');
      return res.status(404).send(status404);
    }
    if (participant.isDavid === true){
      //console.log('is david!');
      res.send({participant});
    } else {
      //console.log('is not david...');
      res.send({participant});
    }
  }).catch((e) => {
    res.status(400).send(e);
  });
});

// Endpoint for POSTing new registrations to participant db
app.post('/registration', (req, res) => {
    //start of pre-registration detection. If participant is pre-registered (has _id), add bibNo. If this is an event day registration, write the full information to the db.
    var successfulPost = ({
      message: `${req.body.firstName} registered with bibNo: ${req.body.bibNo}.`
    });

    Participant.findOne({_id: req.body._id}).then((preregistered) => {
      if (preregistered) {
        var id = preregistered.id;
        Participant.findByIdAndUpdate(id, {bibNo: req.body.bibNo}, {new: true}).then((participant) => {
     }).catch((e) => {
          //console.log('Something went wrong updating bibNo.');
        })
        return res.status(200).send(successfulPost);
      }
      else {
          var newRegistration = new Participant({
          bibNo: req.body.bibNo,
          heat: req.body.heat,
          lastName: req.body.lastName,
          firstName: req.body.firstName,
          email: req.body.email,
          teamID: req.body.teamID,
          gender: req.body.gender,
          birthdate: req.body.birthdate,
          address1: req.body.address1,
          address2: req.body.address2,
          city: req.body.city,
          state: req.body.state,
          phone: req.body.phone,
          zip: req.body.zip,
          isDavid: true
        });
        newRegistration.save().then((doc) => {
          console.log(newRegistration);
          res.send(successfulPost);
        }).catch((e) => {
          //console.log(e);
          res.status(400).send(e);
        });
      }
    }).catch((e) => {
  res.status(404).send(e);
    });
  });

// Binds the root directory to display html results page
app.use('/', express.static(path.join(__dirname, 'reporting')))

// Binds the root directory to display html individual results page
app.use('/individual', express.static(path.join(__dirname, 'individual')))

app.listen(port, () => {
  console.log(`API running on port: ${port}`);
});

module.exports = {app};
