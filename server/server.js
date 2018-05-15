//require general use functions
require('./config/config');
//end general use functions

const _ = require('lodash');
const express = require('express');
const bodyParser = require('body-parser');
const {ObjectID} = require('mongodb');
const path = require('path');
const compression = require('compression');

var {mongoose} = require('./db/mongoose');
var {Participant} = require('./models/participant');
var {eventResults} = require('./models/eventresults');
var {obstacle} = require('./models/obstacle');
var {team} = require('./models/teamTable');
var {counters} = require('./models/counters');
var {dupeResults} = require('./models/duplicateresults');
var {Scoring} = require('./models/scoring');
var {teamScoring} = require('./models/teamscoring');

var status404  = ({message: "Check request and try again."});
var invalidToken = ({message: "Invalid or missing token."});

var app = express();

// this function counts the number of participants still on course, should be called as part of the new/update for team scoring
function onCourse(teamID){
		// update query to say progress $ne "Course Complete"
		var onCourseCount = teamScoring.count({teamID: teamID}).then((count) => {return count
			console.log(count)
		});
		return onCourseCount;
		//return 1
 }


function updateTeamScore(teamID){

//all testing
	// var onCourse = onCourse(teamID);
	// onCourse.then((onCourseCount) => {
	// 	console.log(onCourseCount);
	// 		// if (token ===false){
	// 		// 	return res.status(401).send(invalidToken);
	// 		// } else {
	// 		// 	logEvent(body,res)// call remaining script as function
	// 		// }
	// }).catch((e) => {
	// 	console.log(e);
	// 	})

//testing

	var newScore
	var timestamp = Date.now()
	teamScoring.find({teamID: teamID}).then((scores) => {
		 if(!scores || scores.length == 0){
			 newScore = true
		 } else {
			 newScore = false
		 }
	}, (e) => {
    console.log('trouble')
  });

	// count & rank males first and calculate score, then females
	Scoring.find({
		teamID: teamID,
		gender: 'M'
			}).limit( 3 ).sort( { score: -1 } ).then((results) => {

    		if (!results || results.length < 3) {
      	//	console.log('Bad/wrong team name or team DNQ')
    	}
			else {
				var g1 = 0;
				var g2 = 0;
				var g3 = 0;
				var totScore = 0;

				for(var result in results){
						g1= g1 + results[result].g1
						g2= g2 + results[result].g2
						g3= g3 + results[result].g3;
						totScore= totScore + results[result].score;

				}
					Scoring.find({
						teamID: teamID,
						gender: 'F'
					}).limit( 3 ).sort( { score: -1 } ).then((results) => {
						if (!results || results.length < 3) {
						//	console.log('Bad/wrong team name or team DNQ')
						}
						else {
							for(var result in results){
								g1= g1 + results[result].g1
								g2= g2 + results[result].g2
								g3= g3 + results[result].g3;
								totScore= totScore + results[result].score;
						}
					//end of female else
					}
					// start write score logic
					if (newScore == true){

						// if this is the first result for the team, write a new score.
						var score = new teamScoring({
									 	teamID: teamID,
										 g1:g1,
										 g2:g2,
										 g3:g3,
										 score:totScore,
										updatedOn: timestamp
							});
							score.save().then((doc) => {
								//console.log(newScore)
								newScore == false
							}, (e) => {
								console.log(e);
								//log the error
							});
					} else {
					// if this is an update to a team's score, update
					teamScoring.findOneAndUpdate({ teamID:teamID }, { $set: {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp}} , {returnNewDocument : true}).then((doc) => {
					//console.log(doc)
					}, (e) => {
								console.log(e);
								//log the error
					});

					}
					//end write score logic
					//console.log(g1,g2,g3,totScore,timestamp)
				})

			// end of else
			}
	}, (e) => {
		res.status(400).send(e);
	});
}



function updateScore(bibNo){
	var newScore
	Scoring.find({bibNo: bibNo}).then((scores) => {
		 if(!scores || scores.length ==0){
			 newScore = true
		 } else {
			 newScore = false
		 }
	}, (e) => {
    console.log('trouble')
  });
	eventResults.find({bibNo: bibNo}).then((results) => {
    if (!results || results.length == 0) {
      console.log('Invalid bibNo passed to scoring function')
    }
	//
	// start of getting all participant data
	Participant.findOne({bibNo: bibNo}).then((participant) => {

			var timestamp = Date.now()
           var gender = participant.gender;
           var personBib = participant.bibNo;
           var isDavid = participant.isDavid;
           var firstName = participant.firstName;
           var lastName = participant.lastName;
           var teamName = participant.teamID;
		   var isDavid = participant.isDavid;
           var participantName = "<a href='/individual/?id=" +personBib+"'>" + lastName + ', ' + firstName+"</a>";
           eventResults.find({bibNo: personBib}).then((events) => {
               var g1 = 0;
               var g2 = 0;
               var g3 = 0;
               var totScore = 0;
               var totEvents = 0
							 var next
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

               totScore = (g1*1.0000001) + (g2*3.00001) + (g3*5.001);
               if (totEvents == 12) {
								 //should be refactored for G8
								 progress = 'Course Complete';
								 next  = 99
               } else {
                 progress = totEvents + '/12';
								 next = totEvents + 1
               }
			if (newScore == true){
				// if this is the first result for the participant, write a new score.
				var score = new Scoring({
							participant: participantName,
                 firstName: firstName,
				 			 	lastName: lastName,
				 					gender: gender,
                 bibNo: personBib,
				 			 	isDavid: isDavid,
                 teamID: teamName,
                 g1:g1,
                 g2:g2,
                 g3:g3,
                 score:totScore,
				 			 	updatedOn: timestamp,
                 progress:progress,
								 next: next
          });
          score.save().then((doc) => {
						if (teamName.length > 0) {
							updateTeamScore(teamName)
						}

			//console.log(doc)
          }, (e) => {
            console.log(e);
            //log the error
          });
			} else {
			// if this is an update to a person's score, update

			Scoring.findOneAndUpdate({ bibNo:bibNo }, { $set: {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'progress':totEvents, 'next': next}} , {returnNewDocument : true}).then((doc) => {
				if (teamName.length > 0) {
					updateTeamScore(teamName)
				}

			//console.log(doc)
			}, (e) => {
            console.log(e);
            //log the error
			});


			}

             }, (e) => {
               //res.status(400).send(e);
             });
         });


	//
  }, (e) => {
  //  res.status(400).send(e);
  });
}



// start of function block
function checkAuth(token) {
   // should be a salted hash...
      var tokenCheck = counters.findOne({ token: token}).then((key) => {
      if (!key) {
         return false
       } else {
         return true
       }
     });
     return tokenCheck;
  }


  function getNextSequence(name) {
      var nextSeq = counters.findOneAndUpdate({_id: name}, { $inc: { seq: 1 } }).then((nextcounter) => {return nextcounter.seq
      });
      return nextSeq;
   }

   function getPerson(getList,res){

    getList.then((participants) => {
    // original find request below
       res.send({participants});
     }, (e) => {
       res.status(400).send(e);
     });
   }

   function getScore(scores,res,query){
     eventResults.distinct("bibNo").then((event) => {
       var uniqueBib = event.length;
       for(var bib in event){
         var bibNo = event[bib];
         //get people metadata
         Participant.findOne({bibNo: bibNo}).then((participant) => {

           var gender = participant.gender;
           var personBib = participant.bibNo;
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
             }, (e) => {
               res.status(400).send(e);
             });
         });
       }


       }, (e) => {
         console.log(e);
         res.status(400).send(e);
       });
   }

   //log event function
   function logEvent(body,res){

    var status404  = ({message: "BibNo not found.", bibNo: body.bibNo, obstID: body.obstID});
    Participant.findOne({bibNo: body.bibNo}).then((participant) => {
      var id = participant.id;
      var isDavid = participant.isDavid;
      var firstName = participant.firstName;
      var lastName = participant.lastName;
      var bibNo = participant.bibNo;
      var obstID = body.obstID;

      var successfulPost = ({
        message: `${firstName}`,
        bibNo: `${bibNo}`,
        obstID: `${obstID}`,
		tier: `${body.tier}`,
      });

   if (!participant) {
    return res.status(404).send(status404);
   } else {

    //start of duplicate handling
    eventResults.findOne({bibNo: body.bibNo, obstID: body.obstID}).then((duplicate) => {

      var timestamp = Date.now()
      if (duplicate) {
        // testing block
        var resultDiff = (((((timestamp - duplicate._id.getTimestamp())% 86400000) % 3600000) / 60000));
        if (resultDiff <= 2) {
          //update this with the actual req.body.* fields incl timestamp
          eventResults.findByIdAndUpdate(duplicate._id, {success: body.success, timestamp: timestamp, tier: body.tier}, {new: true}).then((doc) => {
            //insert call to score calculate function to calculate and update score for bibNo n
			updateScore(bibNo)
			// end
			//need to send to an update david function
          return res.status(200).send(successfulPost);
     }).catch((e) => { //
          console.log(e);
          res.status(400).send(e);
        })
      } else {
          // end testing block

                //if duplicate and greater than 2 minutes after the first recorded result, throw a 409 error but write results to a new log table anyway
                var obstResults = new dupeResults({
                  bibNo: body.bibNo,
                  obstID: body.obstID,
                  tier: body.tier,
                  success: body.success,
                  bibFromBand: body.bibFromBand,
                  timestamp: timestamp,
                  deviceTime: body.deviceTime
                });
                console.log('Duplicate logged: ' + JSON.stringify(obstResults));
                obstResults.save().then((doc) => {
								//!!
								//do NOT update score for bibNo = n
								//!!
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
            bibNo: body.bibNo,
            obstID: body.obstID,
            tier: body.tier,
            success: body.success,
            bibFromBand: body.bibFromBand,
            timestamp: timestamp,
            deviceTime: body.deviceTime,
            resultID: nextSeq
          });
          obstResults.save().then((doc) => {
			//insert call to score calculate function to calculate and update score for bibNo n
			updateScore(bibNo)
			// end
            res.send(successfulPost);
          }, (e) => {
            console.log(e);
            res.status(400).send(e);
          });
        });
				// update david flag
              if (isDavid === true){
                 if (body.success === false || body.tier !== 3){
                   Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
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
   }

   //log time function
   function logTime(body,res){
    var status404  = ({message: "BibNo not found.", bibNo: body.bibNo, obstID: body.location});
    Participant.findOne({bibNo: body.bibNo}).then((participant) => {
      var id = participant.id;
      var bibNo = participant.bibNo;
      var location = body.location;
      var time = body.time;
      var firstName = participant.firstName;
      var isDavid = participant.isDavid;
	  	var bibFromBand = body.bibFromBand;
			var heat = participant.heat;

      var update;
     //existing code
      var successfulPost = ({
        message: `${firstName}`,
        bibNo: `${bibNo}`,
        obstID: `${location}`,
				heat: `${heat}`
      });

      if (!participant) {
        return res.status(404).send(status404);
       } else {
         if (location === 'start'){
           update = {'startTime.deviceTime': time, 'startTime.bibFromBand':bibFromBand};
         } else if (location === 'finish'){
            update = {'finishTime.deviceTime': time, 'finishTime.bibFromBand':bibFromBand};
         } else if (location === 'tiebreaker'){
					 var timestamp = Date.now()
           update = {'tiebreaker.time': time, 'tiebreaker.bibFromBand':bibFromBand,'tiebreaker.timestamp':timestamp};
         } else {
           res.status(400).send(e);
         }
         //console.log(update);
         //no duplicate handling, will need to be added here
         Participant.findOneAndUpdate({ bibNo:bibNo }, { $set: update }, {returnNewDocument : true}).then((participant) => {
           if (participant){
			   console.log(participant)
             return res.status(200).send(successfulPost);
           }
           }).catch((e) => {
               console.log(e);
             })
           }
         }

   ).catch((e) => {
   res.status(404).send(status404);
   });
   }

   function registration(req,res){
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
   }

// end of function block

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

// Endpoint for POSTing results from tracker app
app.post('/post-result', (req, res) => {
  var key = req.query.k
  var body = req.body

  if (key !==undefined) {
    var tokenCheck = checkAuth(key);
    tokenCheck.then((token) => {
      //console.log(token);
        if (token ===false){
          return res.status(401).send(invalidToken);
        } else {
          logEvent(body,res)// call remaining script as function
        }
    }).catch((e) => {
      res.status(500).send(e);
      })
    ;}
    else {
      //invert comments below to make token optional/mandatory
      logEvent(body,res)
    //return res.status(401).send(invalidToken);
  }
});

//Complete GET ALL results
// includes logic to send delta results based on an optional query value "q"
app.get('/results', (req, res) => {
  var delta = req.query.d
  if (delta !==undefined) {
  eventResults.find({ resultID: { $gt: delta } }).then((participantResults) => {
    res.send({participantResults});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
  else {
  eventResults.find().then((participantResults) => {
    res.send({participantResults});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });

  }
});

//main scoring endpoint
// needs edits
app.get('/scoring', (req, res) => {
// only one parameter is considered (regardless of how many are passed), in this order or precedence, gender, teamscores, team, onTeam, davids, bibNo, recent, otherwise all results are sent
var status404  = ({message: "BibNo not found."})

  	var gender = req.query.gender
	  var teamScores = req.query.teamScores
		var team = req.query.team
		var onTeam = req.query.onTeam
		var davids = req.query.davids
		var bibNo = req.query.bibNo
  	var recent = req.query.recent

  if (gender !==undefined) {
	// get by gender
  Scoring.find({ gender: gender}).limit( 25 ).sort( { score: -1 } ).then((participantScores ) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
	// TEAM SCORING -- ALL 'teamscores' or one team
  else if (teamScores == 'true'){
	// get all and send
		teamScoring.find().then((teamScores) => {
			res.send({teamScores});
		}, (e) => {
			console.log(e);
			res.status(400).send(e);
		});
  }

	else if (team !==undefined){
		// testing only, remove
		//updateTeamScore(team)
		//

		status404  = ({message: "Team not found."})
		teamScoring.find({ teamID: team}).then((teamScores) => {
			if (!teamScores || teamScores.length == 0) {
				return res.status(404).send(status404);
			}
	    res.send({teamScores});
	  }, (e) => {
	    console.log(e);
	    res.status(400).send(e);
	    });
	}
	// END TEAM SCORING

	else if (onTeam !==undefined){
		status404  = ({message: "Team not found."})
		Scoring.find({ teamID: onTeam}).then((participantScores) => {
			if (!participantScores  || participantScores.length == 0) {
				return res.status(404).send(status404);
			}
	    res.send({participantScores});
	  }, (e) => {
	    console.log(e);
	    res.status(400).send(e);
	    });
	}
	else if (davids == 'true'){
	Scoring.find({
			isDavid: true,
			next: { $gte: 5 }
		}).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
 }
	else if (bibNo !==undefined){
		//console.log(bibNo)
		Scoring.find({ bibNo: bibNo}).then((participantScores) => {
			if (!participantScores || participantScores.length == 0) {
				return res.status(404).send(status404);
			}
	    res.send({participantScores});
	  }, (e) => {
	    console.log(e);
	    res.status(400).send(e);
	    });
	}
  else if (recent == 'true'){
	 // looking at 15 minutes currently
	Scoring.find({
		progress: 'Course Complete',
		updatedOn: { $gte: new Date(Date.now() - 900000).toISOString() }}).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
  else {
	  // get all and send
  Scoring.find().then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });

  }

});

// GET results by bib number
app.get('/results/:id', (req, res) => {
  var id = req.params.id;
  eventResults.find({bibNo: id}).then((participantResults) => {
    if (!participantResults || participantResults.length == 0) {
      return res.status(404).send(status404);
    }
    res.send({participantResults});
  }, (e) => {
    res.status(400).send(e);
  });
});

// GET query of participant table
app.get('/participant', (req, res) => {
	var getList;
	var qLastName = req.query.lastName;
  var birth = req.query.bday;
  var bibNo = req.query.bibNo;
  var key = req.query.k

	if (qLastName !==undefined){
      getList = Participant.find({ lastName: qLastName  }).collation( { locale: 'en', strength: 2 } );
	} else if (birth !==undefined){
      getList = Participant.find({ birthdate: birth  });
	} else if (bibNo !== undefined){
    getList = Participant.find({ bibNo: bibNo  });
  }
  else {
		getList = Participant.find();
	}

  if (key !==undefined) {
    var tokenCheck = checkAuth(key);
    tokenCheck.then((token) => {
        if (token ===false){
          return res.status(401).send(invalidToken);
        } else {
          getPerson(getList,res)
        }
    }).catch((e) => {
      res.status(500).send(e);
      })
    ;}
    else {
      //invert comments below to make token optional/mandatory
      //getPerson(getList,res)
    return res.status(401).send(invalidToken);
  }
});

// Endpoint for POSTing new registrations to participant db
app.post('/registration', (req, res) => {
    var key = req.query.k
    var body = req.body

    if (key !==undefined) {
      var tokenCheck = checkAuth(key);
      tokenCheck.then((token) => {
        //console.log(token);
          if (token ===false){
            return res.status(401).send(invalidToken);
          } else {
            registration(req,res)
          }
      }).catch((e) => {
        res.status(500).send(e);
        })
      ;}
      else {
        //invert comments below to make token optional/mandatory
        //registration(req,res)
      return res.status(401).send(invalidToken);
    }
  });

//test /timing Endpoint
app.post('/timing', (req, res) => {
    var key = req.query.k
    var body = req.body

    if (key !==undefined) {
      var tokenCheck = checkAuth(key);
      tokenCheck.then((token) => {
        //console.log(token);
          if (token ===false){
            return res.status(401).send(invalidToken);
          } else {
            logTime(body,res)// calls remaining script as function
          }
      }).catch((e) => {
        res.status(500).send(e);
        })
      ;}
      else {
        //invert comments below to make token optional/mandatory
        //logTime(body,res)
      return res.status(401).send(invalidToken);
    }
  });

// Binds the root directory to display html results page
app.use('/', express.static(path.join(__dirname, 'reporting')))

// Binds the root directory to display html individual results page
app.use('/individual', express.static(path.join(__dirname, 'individual')))

app.listen(port, () => {
  console.log(`API running on port: ${port}`);
});

module.exports = {app};
