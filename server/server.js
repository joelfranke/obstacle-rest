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


//define relevant ENV variables

	//on start up, count and set an environment variable for the count of obstacles
	function countObstacles(){
		obstacles.find({scored:{$ne:false}}).then((obstacles) => {
			var obstacleCount = JSON.stringify(obstacles.length)
			process.env.totalObstacleCount = obstacleCount
				 console.log(`There are: ${process.env.totalObstacleCount} obstacles.`)
		}, (e) => {
	    console.log('trouble with obstacle count calculation')
	  });
	}
//end ENV variables
var app = express();

function updateTeamScore(teamID){

	var newScore
	var timestamp = Date.now()
	teamScoring.find({teamID: teamID}).then((scores) => {
		 if(!scores || scores.length == 0){
			 newScore = true
		 } else {
			 newScore = false
		 }
	}, (e) => {
    console.log('trouble with team calculation')
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
						// start write score logic
						Participant.count({teamID:teamID, bibNo:{ $gt:0}, finishTime:null}).then((count) => {
							if (newScore == true){

								// if this is the first result for the team, write a new score.
								var score = new teamScoring({
												teamID: teamID,
												 g1:g1,
												 g2:g2,
												 g3:g3,
												 onCourse:count,
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
							teamScoring.findOneAndUpdate({ teamID:teamID }, { $set: {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'onCourse':count}} , {returnNewDocument : true}).then((doc) => {
							}, (e) => {
										console.log(e);
							});
							}
						}, (e) => {
									console.log(e);
						});
					//end of female else
					}
				})

			// end of else
			}
	}, (e) => {
		res.status(400).send(e);
	});
}

function updateScore(bibNo,tiebreaker){
	var newScore
	var update
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
					 var group = participant.group;
					 var g8 = participant.g8;
					 var lapScore = participant.lapScore
           var participantName = "<a href='/individual/?id=" +personBib+"'>" + lastName + ', ' + firstName+"</a>";
					 //.sort( { obstID: 1, points: -1 } ) to sort by obstID and desc for points, to take the max score per obstacle ID
           eventResults.find({bibNo: personBib}).sort( { obstID: 1, points: -1 } ).then((events) => {
               var g1 = 0;
               var g2 = 0;
               var g3 = 0;
               var totScore = 0;
               var totEvents = 0
							 var next
							 var currentObstID = 0
							 var obstID
							 var points
							 var countScore

               for(var event in events){

								 obstID = events[event].obstID
								 points = events[event].points
								 countScore = events[event].countScore
								 var success = events[event].success
								 var tier = events[event].tier
								 var success = events[event].success
								 var tier = events[event].tier
								//console.log(currentObstID,g1,g2,g3)
								 if (obstID == currentObstID){
										 continue
								 } else {
									 //this logic handles regular scores/existing code where there is no redundant obstID
									 if (success == true && countScore==true){
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
									 currentObstID = obstID
								 }
               }
						 	//point values would need to be pulled in on a per-obstacle basis
               totScore = (g1*1.0000001) + (g2*3.00001) + (g3*5.001);
							 if(g8==false){
								 //update totEvents logic for g8 to feed this
               	if (totEvents == Number(process.env.totalObstacleCount)) {
								 	//should be refactored for G8
								 	progress = 'Course Complete';
								 	next  = 99
               	} else {
									progress = events.length + `/${process.env.totalObstacleCount}`;
                 	//progress = totEvents + `/${process.env.totalObstacleCount}`;
								 	next = totEvents + 1
               	}
						 	} else {
									progress = totEvents + `/??`;
									//is this logic used in the app?
									next = totEvents + 1
							}

			if (newScore == true){
				if (tiebreaker){
					tiebreaker = tiebreaker
				} else {
					tiebreaker = 999.99
				}
				// if this is the first result for the participant, write a new score.
				var score = new Scoring({
							participant: participantName,
                firstName: firstName,
				 			 	lastName: lastName,
				 				gender: gender,
								group: group,
                bibNo: personBib,
								g8:g8,
								lapScore:lapScore,
				 			 	isDavid: isDavid,
                teamID: teamName,
                g1:g1,
                g2:g2,
                g3:g3,
                score:totScore,
				 			 	updatedOn: timestamp,
                progress:progress,
								obstaclesCompleted:totEvents,
								next: next,
								tiebreaker: tiebreaker
          });
          score.save().then((doc) => {
						if (teamName && teamName.length > 0) {
							updateTeamScore(teamName)
						}

			//console.log(doc)
          }, (e) => {
            console.log(e);
            //log the error
          });
			} else {
			// if this is an update to a person's score, update
			if (tiebreaker){
				update = {'updatedOn': timestamp,'tiebreaker':tiebreaker}
				//console.log(bibNo,update);
			} else {
				update = {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'progress':progress, 'next': next,'obstaclesCompleted':totEvents, 'isDavid':isDavid}
			}
			//Scoring.findOneAndUpdate({ bibNo:bibNo }, { $set: {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'progress':progress, 'next': next}} , {returnNewDocument : true}).then((doc) => {
			Scoring.findOneAndUpdate({ bibNo:bibNo }, { $set: update} , {returnNewDocument : true}).then((doc) => {

				if (teamName && teamName.length > 0) {
					updateTeamScore(teamName)
				}
			}, (e) => {
            console.log(e);
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
			var g8 = participant.g8
			var lapCount = participant.lapCount

			//start testing
			//var deviceTime= body.deviceTime.replace('AM','a.m.')
			//deviceTime=deviceTime.replace('PM','p.m.')
			//heat = heat.replace(' AM',':00 AM')
		//	heat = heat.replace(' PM',':00 PM')
		var deviceTime= body.deviceTime
		//deviceTime=deviceTime.replace(' PM',':00 PM')
			var courseTimeLimit = participant.courseTimeLimit;


			scanTime = timeDate.parse(deviceTime,'h:mm:ss A', false)
		//	console.log(courseTimeLimit,deviceTime,scanTime)

			if(Date.parse(scanTime)<Date.parse(courseTimeLimit)){
				  countScore=true
					secondsRemaining= (Date.parse(courseTimeLimit)-Date.parse(scanTime))/1000
			} else {
				countScore=false
				secondsRemaining=0
			}

			//end testing

			//set points value
			var points = 0
			var tier = body.tier;
			if (body.success == true && countScore == true){
				if (tier ==1){
					points =1
				}
				if (tier == 2){
					points = 3
				}
				if (tier == 3){
					points = 5
				}
			} else {
				points = 0
			}
			//end point value
      var successfulPost = ({
        message: `${firstName}`,
        bibNo: `${bibNo}`,
        obstID: `${obstID}`,
				tier: `${body.tier}`,
				secondsRemaining:`${secondsRemaining}`
      });

   if (!participant) {
    return res.status(404).send(status404);
   } else {
    //start of duplicate handling
		//use lapCount as a way to differentiate the obstacle submissions
    eventResults.findOne({bibNo: body.bibNo, obstID: body.obstID, lapCount:lapCount}).then((duplicate) => {
      var timestamp = Date.now()
      if (duplicate) {
        var resultDiff = (((((timestamp - duplicate._id.getTimestamp())% 86400000) % 3600000) / 60000));
        if (resultDiff <= 2) {
          //update this with the actual req.body.* fields incl timestamp
          eventResults.findByIdAndUpdate(duplicate._id, {success: body.success, points: points, timestamp: timestamp, tier: body.tier}, {new: true}).then((doc) => {
			// no courseTimeLimit check required for this edge case since the prevailing assumption is that the two minutes never happend.
			// TODO: Update isDavid flag for participant
			 if (isDavid === true){
			 	 if (countScore === false || (body.success === false || body.tier !== 3)){
			 		 Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
						 //conditionally use updateG8Score()
			 				 updateScore(bibNo)
			 	}).catch((e) => {
			 			 console.log('Something went wrong.');
			 		 })
			 	 } else {
					 //conditionally use updateG8Score()
			 		 updateScore(bibNo)
			 	 }
			 } else {
				 //conditionally use updateG8Score()
			 		updateScore(bibNo)
			 }
			// // END OF TEST BLOCK

			// uncomment the below if the above test block is not active
			//updateScore(bibNo)

          return res.status(200).send(successfulPost);
     }).catch((e) => { //
          console.log(e);
          res.status(400).send(e);
        })
      } else {
          // end of 2 minute duplicate handling block
				//if duplicate and greater than 2 minutes after the first recorded result, throw a 409 error but write results to a new log table anyway


						var obstResults = new dupeResults({
							bibNo: body.bibNo,
							obstID: body.obstID,
							tier: body.tier,
							success: body.success,
							bibFromBand: body.bibFromBand,
							timestamp: timestamp,
							points: points,
							deviceTime: body.deviceTime,
							g8:g8,
							countScore: countScore,
							lapCount: lapCount
						});
						console.log('Duplicate logged: ' + JSON.stringify(obstResults));
						obstResults.save().then((doc) => {
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
						points: points,
						g8:g8,
            resultID: nextSeq,
						countScore: countScore,
						lapCount: lapCount
          });
          obstResults.save().then((doc) => {
			//insert call to score calculate function to calculate and update score for bibNo n
			//create a new function to update the score for g8s.
			if (isDavid === true){
				 if (countScore === false || (body.success === false || body.tier !== 3)){
					 Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
							 updateScore(bibNo)
				}).catch((e) => {
						 console.log('Something went wrong.');
					 })
				 } else {
					 updateScore(bibNo)
				 }
			} else {
					updateScore(bibNo)
			}

			// end
            res.send(successfulPost);
          }, (e) => {
            console.log(e);
            res.status(400).send(e);
          });
        });
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
		var status500  = ({message: "Something went wrong processing this request.", bibNo: body.bibNo, obstID: body.location});
    Participant.findOne({bibNo: body.bibNo}).then((participant) => {

      var id = participant.id;
      var bibNo = participant.bibNo;
      var location = body.location;
      var time = body.deviceTime;
      var firstName = participant.firstName;
      var isDavid = participant.isDavid;
	  	var bibFromBand = body.bibFromBand;
			var heat = participant.heat;
			var ropeTime = body.time;
			var g8 = participant.g8
			var lapCount = participant.lapCount

      var update
			var needNewHeat = false

			var newLocation
			if (location === 'start'){
				newLocation = 101
			} else if (location === 'finish'){
					newLocation = 102
				} else {
					newLocation = 103
				}

				var successfulPost = ({
					message: `${firstName}`,
					bibNo: `${bibNo}`,
					obstID: newLocation,
				//	obstID: `${location}`,
					heat: `${heat}`
				});


      if (!participant) {
        return res.status(404).send(status404);
       } else {
         if (location === 'start'){
					 // start of new code https://trello.com/c/0vlmzDx5/106-time-limit-for-scores

					 // add update/calculate courseTimeLimit value
					 // transform time from AM to a.m. format REMOVED 4/24 with new date time library
					 //console.log(time)
					 //time = time.replace('AM','a.m.')
					 //time = time.replace('PM','p.m.')
					 heat = heat.replace(' AM',':00 AM')
					 heat = heat.replace(' PM',':00 PM')




					// console.log(heat, time)
					 scanTime = timeDate.parse(time,'h:mm:ss A', false)
					 heatTime = timeDate.parse(heat,'h:mm:ss A', false)

					 heatDiff = (timeDate.addMinutes(heatTime,2)-scanTime)/60000
					 //logging for the dateTimeLib
					// console.log(time,scanTime,heat,heatTime, heatDiff)
					// console.log(heatTime, scanTime)

					 if((heatDiff>15 || heatDiff<0) && g8 == false){
						 //revise startHeat to correct heat time then
						 var needNewHeat = true
						 var newHeat
						 Participant.distinct('heat').then((heats) => {


					 		var heatResponse = []
					 		var heat
							var arrayLength = heats.length;
							var heatFromList
							//var newHeat

							for (var i = 0; i < arrayLength; i++) {

					 			heat = heats[i]
					 			// transform time from AM to a.m. format
					 			//heat = heat.replace(' AM',':00 a.m.')
					 			//heat = heat.replace(' PM',':00 p.m.')

								heat = heat.replace(' AM',':00 AM')
		 					  heat = heat.replace(' PM',':00 PM')
					 			heatTime = timeDate.parse(heat,'h:mm:ss A', false)

					 			heatResponse.push(heatTime)
					 		}
					 		//sort the results by time
					 		heatResponse.sort()

							// compare times against the scan time
					 		var heatArrayLength = heatResponse.length;

					 			for (var j = 0; j < heatArrayLength; j++) {
									// compare scanTime vs. available heat times and write the next best heat time into the startHeat field
									 heatFromList = heatResponse[j]
									if (scanTime > heatFromList){
										newHeat = heatFromList

										continue
									} else {
										newHeat = heatFromList

										break
									}
					 		}

					 		//do something
								lapCount = 1
								courseTimeLimit = timeDate.addHours(newHeat,4)
								courseTimeLimit = timeDate.addMinutes(courseTimeLimit,1)
								newHeat = timeDate.format(newHeat, 'h:mm A');
								newHeat = newHeat.replace('a.m.','AM')
								newHeat = newHeat.replace('p.m.','PM')
							 //set course time limit and new heat time + lapcount
								update = {'startTime.deviceTime': time, 'startTime.bibFromBand':bibFromBand, 'startHeat':newHeat, 'courseTimeLimit':courseTimeLimit,'lapCount':lapCount};

							Participant.findOneAndUpdate({ bibNo:bibNo }, { $set: update }, {returnNewDocument : true}).then((participant) => {
								//these lines removed to account for changes to the date-and-time package
								//newHeat = timeDate.format(newHeat, 'h:mm A');
								//newHeat = newHeat.replace('a.m.','AM')
								//newHeat = newHeat.replace('p.m.','PM')
								var newLocation
								if (location === 'start'){
									newLocation = 101
								} else if (location === 'finish'){
										newLocation = 102
									} else {
										newLocation = 103
									}

									var successfulPost = ({
										message: `${firstName}`,
										bibNo: `${bibNo}`,
										obstID: newLocation,
									//	obstID: `${location}`,
										heat: `${newHeat}`
									});

								return res.status(200).send(successfulPost);
								//console.log('should end here')
								}).catch((e) => {
										console.log(e);
									})

					   }, (e) => {
					     console.log(e);
					     });

						 // end get correct heat time

					 } else {
						 //set startHeat parameter with current heat assignment
						 //set course time limit
						 if (g8 == true){
							 if (lapCount == 0){
								 lapCount = lapCount+1
								 courseTimeLimit = timeDate.addHours(heatTime,8)
								 courseTimeLimit = timeDate.addMinutes(courseTimeLimit,1)
								 heatTime = timeDate.format(heatTime, 'h:mm A');
								 heatTime = heatTime.replace('a.m.','AM')
								 heatTime = heatTime.replace('p.m.','PM')
								 update = {'startTime.deviceTime': time, 'startTime.bibFromBand':bibFromBand, 'startHeat':heatTime, 'courseTimeLimit':courseTimeLimit, 'lapCount':lapCount};
							 } else {
								 lapCount = lapCount+1
								 update = {'lapCount':lapCount};
							 }
						 } else {
							lapCount = 1
							courseTimeLimit = timeDate.addHours(heatTime,4)
							courseTimeLimit = timeDate.addMinutes(courseTimeLimit,1)
							heatTime = timeDate.format(heatTime, 'h:mm A');
							heatTime = heatTime.replace('a.m.','AM')
							heatTime = heatTime.replace('p.m.','PM')
							update = {'startTime.deviceTime': time, 'startTime.bibFromBand':bibFromBand, 'startHeat':heatTime, 'courseTimeLimit':courseTimeLimit, 'lapCount':lapCount};
						 }
					 }
					 // end of new code
         } else if (location === 'finish'){
            update = {'finishTime.deviceTime': time, 'finishTime.bibFromBand':bibFromBand, 'progress':'Course Complete' };
         } else if (location === 'tiebreaker'){
					 var timestamp = Date.now()
           update = {'tiebreaker.deviceTime': time, 'tiebreaker.bibFromBand':bibFromBand,'tiebreaker.timestamp':timestamp, 'tiebreaker.time':ropeTime};
         } else {
           res.status(400).send(e);
         }

				 if(needNewHeat === false){
         Participant.findOneAndUpdate({ bibNo:bibNo }, { $set: update }, {returnNewDocument : true}).then((participant) => {
           if (participant){
			   			if(ropeTime){
								updateScore(bibNo,ropeTime)
							}

             return res.status(200).send(successfulPost);
           }
           }).catch((e) => {
               console.log(e);
             })
						}

           }
         }

   ).catch((e) => {
		 //throw 500 error if something goes wrong
		 console.log(e)
   	res.status(500).send(status500);
   });
   }

   function registration(req,res){
     //start of pre-registration detection. If participant is pre-registered (has _id), add bibNo. If this is an event day registration, write the full information to the db.
     var successfulPost = ({
       message: `${req.body.firstName} registered with bibNo: ${req.body.bibNo}.`
     });
		 //check bibNo and whether or not it is already registered to a person
		 Participant.findOne({bibNo: req.body.bibNo}).then((conflict) => {
				       if (conflict) {
								 var conflictMsg = ({
									 message: `${conflict.firstName} ${conflict.lastName} already registered with bibNo: ${conflict.bibNo}.`
								 });
								 res.status(409).send(conflictMsg)

				       } else {

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
					 group: req.body.group,
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
		 }
	 )}


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
  var key = req.headers.k
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
    	//  logEvent(body,res)
    return res.status(401).send(invalidToken);
  }
});

// Endpoint for updating results
app.post('/update-score', (req, res) => {
  var key = req.headers.k
  var bibNo = req.body.bibNo

  if (key !==undefined) {
    var tokenCheck = checkAuth(key);
    tokenCheck.then((token) => {
      //console.log(token);
        if (token ===false){
          return res.status(401).send(invalidToken);
        } else {
          updateScore(bibNo)
					return res.status(200).send({bibNo});
        }
    }).catch((e) => {
      res.status(500).send(e);
      })
    ;}
    else {
      //invert comments below to make token optional/mandatory
    	//  logEvent(body,res)
    return res.status(401).send(invalidToken);
  }
});

//Complete GET ALL results
// includes logic to send delta results based on an optional query value "q"
app.get('/results', (req, res) => {
  var delta = req.query.d
	var _id = req.query.id
  if (delta !==undefined) {
  eventResults.find({ resultID: { $gt: delta } }).then((participantResults) => {
    res.send({participantResults});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  } else if (_id!==undefined) {
		eventResults.find({ _id: _id }).then((participantResults) => {
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

//Complete GET ALL results
// includes logic to send delta results based on an optional query value "q"
app.get('/scoring/results', (req, res) => {
  var delta = req.query.d
	var _id = req.query.id
  if (delta !==undefined) {
  eventResults.find({ resultID: { $gt: delta } }).then((participantResults) => {
    res.send({participantResults});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  } else if (_id!==undefined) {
		eventResults.find({ _id: _id }).then((participantResults) => {
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
// includes logic to send delta results based on an optional query value "q"
app.get('/heats', (req, res) => {


  Participant.distinct('heat').then((heats) => {

		var heatResponse = []
		var heatTimes = []
		var heat
		//console.log(heats)

		var arrayLength = heats.length;
		for (var i = 0; i < arrayLength; i++) {
	    //console.log(heats[i]);
			heat = heats[i]
			    //Do something
			// transform time from AM to a.m. format
			//heat = heat.replace(' AM',':00 a.m.')
		//	heat = heat.replace(' PM',':00 p.m.')

		heat = heat.replace(' AM',':00 AM')
		heat = heat.replace(' PM',':00 PM')

			heatTime = timeDate.parse(heat,'h:mm:ss A', false)
			//console.log(heatTime)
			heatResponse.push(heatTime)
		}

		//sort the results by time
		heatResponse.sort()
		var heatArrayLength = heatResponse.length;
			for (var i = 0; i < heatArrayLength; i++) {
				//do Something
				heatFormat = timeDate.format(heatResponse[i], 'h:mm A');

				heat = heatFormat.replace('p.m.','PM')
				heat = heat.replace('a.m.','AM')
				//console.log(heat)
				heatTimes.push({heat})
		}

		//sends response
		res.send({heatTimes});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });

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
		var ranks = req.query.ranks
		var limit = req.query.limit
		if (limit !== undefined) {
			n = Number(limit)
		} else {
			n=25
		}

//console.log(n, limit)

  if (gender !==undefined) {
	// get by gender
  Scoring.find({ gender: gender, lapScore:{$ne:true}}).limit( n ).sort( { score: -1, tiebreaker: 1  } ).then((participantScores ) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
	// TEAM SCORING -- ALL 'teamscores'
  else if (teamScores == 'true'){
			// get all and send
				teamScoring.find().sort( { score: -1 } ).then((teamScores) => {
					res.send({teamScores});
				}, (e) => {
					console.log(e);
					res.status(400).send(e);
				});
  }

		else if (team !==undefined){
				status404  = ({message: "Team not found."})
				teamScoring.aggregate([
					{$sort: { score: -1 } },
					{$group: {
							_id: false,
							team: {
									$push: {
											_id:"$_id",
											teamID: "$teamID",
											score: "$score",
											g1: "$g1",
											g2: "$g2",
											g3: "$g3",
											onCourse: "$onCourse"
											}
									}
							}
					},
					{$unwind:
						{
							path: "$team",
							includeArrayIndex: "rank"
						}
					},
					{$match:
						{
							"team.teamID": team
						}
					}
					]
			).allowDiskUse(true)//better memory handling
			.then((withRanks) => {
			//added 404 for zero results
			if (!withRanks  || withRanks.length == 0) {
				return res.status(404).send(status404);
			}
				var rankOffset = withRanks[0].rank + 1
				var teamScores = [{
					_id: withRanks[0].team._id,
					 g1: withRanks[0].team.g1,
					 g2: withRanks[0].team.g2,
					 g3: withRanks[0].team.g3,
					 score: withRanks[0].team.score,
					 onCourse: withRanks[0].team.onCourse,
					 teamID: withRanks[0].team.teamID,
				 rank: rankOffset
				}]

				//send results
				res.send({teamScores});
		}, (e) => {
			console.log(e);
			res.status(400).send(e);
		});

	}
	// END TEAM SCORING

	else if (onTeam !==undefined){
		status404  = ({message: "Team not found."})
		Scoring.find({ teamID: onTeam}).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
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
			next: { $gte: 3 }
		}).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
 }
	else if (bibNo !==undefined){
		//console.log(bibNo)
		Scoring.find({ bibNo: bibNo}).then((individualScores) => {
			if (!individualScores || individualScores.length == 0) {
				return res.status(404).send(status404);
			}
			individualScores = individualScores[0]
			// insert aggregation pipeline and scoring request here based on values of participant scores
			//start with scores from participantScores, then pull ranks/counts to create the master object that is sent
			//should benchmark performance before changing code
			// start testing
				var id = individualScores._id
				var firstName = individualScores.firstName
				var lastName = individualScores.lastName
				var gender = individualScores.gender
				var g1 = individualScores.g1
				var g2 = individualScores.g2
				var g3 = individualScores.g3
				var score = individualScores.score
				var progress = individualScores.progress
				var next = individualScores.next
				var tiebreaker = individualScores.tiebreaker
				var isDavid = individualScores.isDavid
				var teamID = individualScores.teamID
				var group = individualScores.group
				var participant = individualScores.participant
				var obstaclesCompleted = individualScores.obstaclesCompleted

						// get rank from all scores
						Scoring.aggregate([

							{ $sort: { score: -1, tiebreaker:1 } },
								{
										"$group": {
											"_id": false,
											"count":{$sum:1},
											"participant": {
												"$push": {
													"_id":"$_id",
													"bibNo": "$bibNo"
												}
											}
										}
									},
							{
								"$unwind": {
									"path": "$participant",
									"includeArrayIndex": "rank"
								}
							},
								{
									"$match": {
										"participant.bibNo": Number(bibNo)
									}
								}
							]).then((totalRank) => {
									var rank = totalRank[0].rank + 1
									var rankCount = totalRank[0].count

									// get rank by gender
									Scoring.aggregate([
										// use this for gender match
										{
											$match: {
												gender: gender
											}
										},
										{ $sort: { score: -1, tiebreaker:1 } },
											{
													"$group": {
														"_id": false,
														"genderCount":{$sum:1},
														"participant": {
															"$push": {
																"_id":"$_id",
																"bibNo": "$bibNo"
															}
														}
													}
												},
										{
											"$unwind": {
												"path": "$participant",
												"includeArrayIndex": "genderRank"
											}
										},
											{
												"$match": {
													"participant.bibNo": Number(bibNo)
												}
											}
										]).then((genderRank) => {
											var sexRank = genderRank[0].genderRank + 1
											var sexRankCount = genderRank[0].genderCount
											//console.log(sexRank,sexRankCount)
											//get rank by group
											Scoring.aggregate([

												//use this for group match
												{
												"$match": {
												group: group
												}
												},

												{ $sort: { score: -1, tiebreaker:1 } },
													{
															"$group": {
																"_id": false,
																"groupcount":{$sum:1},
																"participant": {
																	"$push": {
																		"_id":"$_id",
																		"bibNo": "$bibNo"
																	}
																}
															}
														},
												{
													"$unwind": {
														"path": "$participant",
														"includeArrayIndex": "grouprank"
													}
												},
													{
														"$match": {
															"participant.bibNo": Number(bibNo)
														}
													}
												]).then((groupingRank) => {
													var groupRank = groupingRank[0].grouprank + 1
													var groupRankCount = groupingRank[0].groupcount
													var participantScores = [{
													 	_id:id,
														firstName: firstName,
														 lastName:lastName,
														gender: gender,
														bibNo:Number(bibNo),
														g1:g1,
														g2:g2,
														g3:g3,
														score:score,
														progress:progress,
														next:next,
														tiebreaker:tiebreaker,
														isDavid:isDavid,
														teamID:teamID,
														group:group,
														obstaclesCompleted:obstaclesCompleted,
														participant:participant,
														rank:rank,
														rankCount:rankCount,
														sexRank:sexRank,
														sexRankCount:sexRankCount,
														groupRank:groupRank,
														groupRankCount:groupRankCount

													 }]

													//send results
													res.send({participantScores})


												}, (e) => {
													console.log(e);
												})


										}, (e) => {
											console.log(e);
										})

							}, (e) => {
								console.log(e);
							})
//end testing


	    //res.send({participantScores});
	  }, (e) => {
	    console.log(e);
	    res.status(400).send(e);
	    });
	}
  else if (recent == 'true'){
	 // looking at 15 minutes currently
	Scoring.find({
		progress: 'Course Complete',
		updatedOn: { $gte: new Date(Date.now() - 900000).toISOString() }}).sort( { updatedOn: -1 } ).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
  else {
	  // get all non-g8 scores (except for the first circut) and send
  Scoring.find({lapScore:{$ne:true}}).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });
  }

});

//adding duplicate, better versions of existing endpoints
//modified individual scoring endpoint
app.get('/scoring/participants', (req, res) => {
// only one parameter is considered (regardless of how many are passed), in this order or precedence, gender, teamscores, team, onTeam, davids, bibNo, recent, otherwise all results are sent
var status404  = ({message: "BibNo not found."})

  	var gender = req.query.gender
		var onTeam = req.query.onTeam
		var davids = req.query.davids
		var recent = req.query.recent
		var limit = req.query.limit
		if (limit !== undefined) {
			n = Number(limit)
		} else {
			n=25
		}

//console.log(n, limit)

  if (gender !==undefined) {
	// get by gender
  Scoring.find({ gender: gender,lapScore:{$ne:true}}).limit( n ).sort( { score: -1, tiebreaker: 1  } ).then((participantScores ) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }

	else if (onTeam !==undefined){
		status404  = ({message: "Team not found."})
		Scoring.find({ teamID: onTeam}).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
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
			next: { $gte: 3 }
		}).limit( n ).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
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
		updatedOn: { $gte: new Date(Date.now() - 900000).toISOString() }}).limit( n ).sort( { updatedOn: -1 } ).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
  }
  else {
		// get all non-g8 scores (except for the first circut) and send
  Scoring.find({lapScore:{$ne:true}}).sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
    res.send({participantScores});
  }, (e) => {
    console.log(e);
    res.status(400).send(e);
  });

  }

});

//updated GET scores for individual endpoint

app.get('/scoring/participants/:bibNo', (req, res) => {
// only one parameter is considered (regardless of how many are passed), in this order or precedence, gender, teamscores, team, onTeam, davids, bibNo, recent, otherwise all results are sent
var status404  = ({message: "BibNo not found."})


		var bibNo = req.params.bibNo
		var ranks = req.query.ranks

 if (bibNo !==undefined){
		//console.log(bibNo)
		Scoring.find({ bibNo: bibNo}).then((individualScores) => {
			if (!individualScores || individualScores.length == 0) {
				return res.status(404).send(status404);
			}
			individualScores = individualScores[0]
			// insert aggregation pipeline and scoring request here based on values of participant scores
			//start with scores from participantScores, then pull ranks/counts to create the master object that is sent
			//should benchmark performance before changing code
			// start testing
				var id = individualScores._id
				var firstName = individualScores.firstName
				var lastName = individualScores.lastName
				var gender = individualScores.gender
				var g1 = individualScores.g1
				var g2 = individualScores.g2
				var g3 = individualScores.g3
				var score = individualScores.score
				var progress = individualScores.progress
				var next = individualScores.next
				var tiebreaker = individualScores.tiebreaker
				var isDavid = individualScores.isDavid
				var teamID = individualScores.teamID
				var group = individualScores.group
				var participant = individualScores.participant
				var obstaclesCompleted = individualScores.obstaclesCompleted

						// get rank from all scores
						Scoring.aggregate([
							// exclude g8s
							{
								$match: {
									lapScore: false
								}
							},
							{ $sort: { score: -1, tiebreaker:1 } },
								{
										"$group": {
											"_id": false,
											"count":{$sum:1},
											"participant": {
												"$push": {
													"_id":"$_id",
													"bibNo": "$bibNo"
												}
											}
										}
									},
							{
								"$unwind": {
									"path": "$participant",
									"includeArrayIndex": "rank"
								}
							},
								{
									"$match": {
										"participant.bibNo": Number(bibNo)
									}
								}
							]).then((totalRank) => {
									var rank = totalRank[0].rank + 1
									var rankCount = totalRank[0].count

									// get rank by gender
									Scoring.aggregate([
										// use this for gender match
										{
											$match: {
												lapScore:false,
												gender: gender
											}
										},
										{ $sort: { score: -1, tiebreaker:1 } },
											{
													"$group": {
														"_id": false,
														"genderCount":{$sum:1},
														"participant": {
															"$push": {
																"_id":"$_id",
																"bibNo": "$bibNo"
															}
														}
													}
												},
										{
											"$unwind": {
												"path": "$participant",
												"includeArrayIndex": "genderRank"
											}
										},
											{
												"$match": {
													"participant.bibNo": Number(bibNo)
												}
											}
										]).then((genderRank) => {
											var sexRank = genderRank[0].genderRank + 1
											var sexRankCount = genderRank[0].genderCount
											//console.log(sexRank,sexRankCount)
											//get rank by group
											Scoring.aggregate([

												//use this for group match
												{
												"$match": {
													lapScore:false,
												group: group
												}
												},

												{ $sort: { score: -1, tiebreaker:1 } },
													{
															"$group": {
																"_id": false,
																"groupcount":{$sum:1},
																"participant": {
																	"$push": {
																		"_id":"$_id",
																		"bibNo": "$bibNo"
																	}
																}
															}
														},
												{
													"$unwind": {
														"path": "$participant",
														"includeArrayIndex": "grouprank"
													}
												},
													{
														"$match": {
															"participant.bibNo": Number(bibNo)
														}
													}
												]).then((groupingRank) => {
													var groupRank = groupingRank[0].grouprank + 1
													var groupRankCount = groupingRank[0].groupcount
													var participantScores = [{
													 	_id:id,
														firstName: firstName,
														 lastName:lastName,
														gender: gender,
														bibNo:Number(bibNo),
														g1:g1,
														g2:g2,
														g3:g3,
														score:score,
														progress:progress,
														next:next,
														tiebreaker:tiebreaker,
														isDavid:isDavid,
														teamID:teamID,
														group:group,
														obstaclesCompleted:obstaclesCompleted,
														participant:participant,
														rank:rank,
														rankCount:rankCount,
														sexRank:sexRank,
														sexRankCount:sexRankCount,
														groupRank:groupRank,
														groupRankCount:groupRankCount

													 }]

													//send results
													res.send({participantScores})


												}, (e) => {
													console.log(e);
												})


										}, (e) => {
											console.log(e);
										})

							}, (e) => {
								console.log(e);
							})
//end testing
	  }, (e) => {
	    console.log(e);
	    res.status(400).send(e);
	    });
	}

});

app.get('/scoring/teams', (req, res) => {
// only one parameter is considered (regardless of how many are passed), in this order or precedence, gender, teamscores, team, onTeam, davids, bibNo, recent, otherwise all results are sent
	  var teamScores = 'true'

	// TEAM SCORING -- ALL 'teamscores'
 if (teamScores == 'true'){
			// get all and send
				teamScoring.find().sort( { score: -1 } ).then((teamScores) => {
					res.send({teamScores});
				}, (e) => {
					console.log(e);
					res.status(400).send(e);
				});
  }
});

app.get('/scoring/g8', (req, res) => {
	Scoring.aggregate( [
	// First Stage, find only g8 items
			{
			    $match : { "g8": true}
			},
	// Second Stage, combine items and update scores
			{
                            $group : {
															//TODO: add bibNo to this _id object because we will only have one bibNo going forward
                                _id : {firstName:"$firstName" , lastName:"$lastName", group:"$group", gender:"$gender"},
                                g1: { $sum: "$g1"},
                                g2: { $sum: "$g2"},
                                g3: { $sum: "$g3"},
                                score: { $sum: "$score"},
                                obstaclesCompleted: {$sum: "$obstaclesCompleted"}
    		}
			},
		// Third Stage
			{
				$sort : { score: -1 }
			},
                // Fourth Stage, filter out ID and project values
                        { $project: { "_id": 0, "firstName" : "$_id.firstName", "lastName":"$_id.lastName", "group":"$_id.group", "gender":"$_id.gender", "g1": 1, "g2": 1, "g3":1,"score":1,"obstaclesCompleted":1 } }
		]
)
.then((participantScores) => {
		// we could iterate through this array and create an array consistent with the other scoring objects...
			res.send({participantScores});
		}, (e) => {
			console.log(e);
			res.status(400).send(e);
	    });
   });

app.get('/scoring/teams/:team', (req, res) => {
// only one parameter is considered (regardless of how many are passed), in this order or precedence, gender, teamscores, team, onTeam, davids, bibNo, recent, otherwise all results are sent
		var team = req.params.team

	// TEAM SCORING -- ALL 'teamscores'
	if (team !==undefined){
			status404  = ({message: "Team not found."})
			teamScoring.aggregate([
				{$sort: { score: -1 } },
				{$group: {
						_id: false,
						team: {
								$push: {
										_id:"$_id",
										teamID: "$teamID",
										score: "$score",
										g1: "$g1",
										g2: "$g2",
										g3: "$g3",
										onCourse: "$onCourse"
										}
								}
						}
				},
				{$unwind:
					{
						path: "$team",
						includeArrayIndex: "rank"
					}
				},
				{$match:
					{
						"team.teamID": team
					}
				}
				]
		).allowDiskUse(true)//better memory handling
		.then((withRanks) => {
		//added 404 for zero results
		if (!withRanks  || withRanks.length == 0) {
			return res.status(404).send(status404);
		}
			var rankOffset = withRanks[0].rank + 1
			var teamScores = [{
				_id: withRanks[0].team._id,
				 g1: withRanks[0].team.g1,
				 g2: withRanks[0].team.g2,
				 g3: withRanks[0].team.g3,
				 score: withRanks[0].team.score,
				 onCourse: withRanks[0].team.onCourse,
				 teamID: withRanks[0].team.teamID,
			 rank: rankOffset
			}]

			//send results
			res.send({teamScores});
	}, (e) => {
		console.log(e);
		res.status(400).send(e);
	});

}
});
// GET results by bib number by forwarding to the correct route
app.get('/results/:id', (req,res,next) => {
  var id = req.params.id;
	req.url = "/scoring/results/"+id;
	next();
});

// GET results by bib number, but get all results.
app.get('/scoring/results/:id/all', (req, res) => {
  var id = req.params.id;
  eventResults.find({bibNo: id}).sort({obstID:1, points:-1}).then((participantResults) => {
    if (!participantResults || participantResults.length == 0) {
      return res.status(404).send(status404);
    }
			res.send({participantResults});
  }, (e) => {
    res.status(400).send(e);
  });
});

// GET only max results by bib number
app.get('/scoring/results/:id', (req, res) => {
  var id = req.params.id;
	//sort by obstacleID ascending
  eventResults.find({bibNo: id}).sort( { obstID: 1, points: -1 } ).then((participantResults) => {
    if (!participantResults || participantResults.length == 0) {
      return res.status(404).send(status404);
    }
		//console.log(participantResults[0])
		if (participantResults[0].g8==false){
			//this is the typical behavior, only one lap, no logic required
			res.send({participantResults});
		} else {
			var maxResult = participantResults[0]
			var maxScoreParticipantResults = []
			//start with the second item, knowing the first is already set
			//this logic currently leaves the results for the last event  on the table and doesn't write them to the response array
			for (let i = 0; i < participantResults.length; i++) {

				if (participantResults[i].obstID > maxResult.obstID){
						//push the current max value to the max array
						maxScoreParticipantResults.push(maxResult)
						//then set the max result to the current object
						maxResult = participantResults[i]
						//write the last row since there is nothing to compare it to
						if (i == participantResults.length-1){
							maxScoreParticipantResults.push(maxResult)
						}
						//console.log('use this')
				} else if (participantResults[i].points > maxResult.points){
						//push the current max value to the max array
						//then set the max result to the current object
						maxResult = participantResults[i]
						//console.log('new high water mark')
						//write the last row since there is nothing to compare it to
						if (i == participantResults.length-1){
							maxScoreParticipantResults.push(maxResult)
						}
				} else {
						//if it's the last row, write write the max result to the array since there is nothing further to compare it to

						if (i == participantResults.length-1){
							maxScoreParticipantResults.push(maxResult)
						}
						continue
				}
			}
			//replace the participantResults object with the deduped object
			participantResults = maxScoreParticipantResults
			//send response
			res.send({participantResults});
		}
  }, (e) => {
    res.status(400).send(e);
  });
});

// GET only max results by bib number
app.get('/scoring/g8/test', (req, res) => {
	eventResults.find({g8:true}).sort( {bibNo: 1, obstID: 1, points: -1 } ).then((participantResults) => {
		if (!participantResults || participantResults.length == 0) {
			return res.status(200).send('[]');
		}
			var g8 = []
			var obstacleCount = 0
			var currentBibNo = 0
			var g1 = 0
			var g2 = 0
			var g3 = 0
			var totalObstacleCount = 0

			for (let i = 0; i < participantResults.length; i++) {
				bibNo = participantResults[i].bibNo
				success = participantResults[i].success
				countScore = participantResults[i].countScore
				tier = participantResults[i].tier
				getList = Participant.find({bibNo: bibNo});
				if (bibNo == currentBibNo) {
					if(countScore == true && success == true) {
						totalObstacleCount = totalObstacleCount + 1
						if (tier ==1){
							g1 = g1 + 1;
						}
						if (tier == 2){
							g2 = g2 + 1;
						}
						if (tier == 3){
							g3 = g3 + 1;
						}
					} else {
						totalObstacleCount = totalObstacleCount + 1
					}
					//if it is the very last eventResult for a person, just push it
					if(i==participantResults.length-1){
							var participantScore = new Object()
							participantScore.bibNo=currentBibNo
							participantScore.g1=g1
							participantScore.g2=g2
							participantScore.g3=g3
							participantScore.score=(g1*1.0000001) + (g2*3.00001) + (g3*5.001);
							g8.push(participantScore)

					}
				} else {
						var participantScore = new Object()
						participantScore.bibNo=currentBibNo
						participantScore.g1=g1
						participantScore.g2=g2
						participantScore.g3=g3
						participantScore.score=(g1*1.0000001) + (g2*3.00001) + (g3*5.001);
						//could conditionally call participants to get the other details before doing this??
						if(currentBibNo !=0){
							g8.push(participantScore)
						}
					currentBibNo = bibNo
					score=0
					g1=0
					g2=0
					g3=0
					totalObstacleCount = 0
					if(countScore == true && success == true) {
						totalObstacleCount = totalObstacleCount + 1
						if (tier ==1){
							g1 = g1 + 1;
						}
						if (tier == 2){
							g2 = g2 + 1;
						}
						if (tier == 3){
							g3 = g3 + 1;
						}
					} else {
						totalObstacleCount = totalObstacleCount + 1
					}
				} //end else if it's a new bibNo
			}

			g8 = g8.sort((a, b) => {
  		if (a.score < b.score) {
    	return 1;
  		}
		});
			res.send(g8);
		}, (e) => {
		res.status(400).send(e);
	});
});

// GET query of participant table
app.get('/participant', (req, res) => {
	var getList;
	var qLastName = req.query.lastName
  var birth = req.query.bday
  var bibNo = req.query.bibNo
	var onTeam = req.query.onTeam
	var dbID = req.query.id
  var key = req.headers.k
	//var key = req.query.k

	if (qLastName !==undefined){
      getList = Participant.find({ lastName: qLastName,lapScore:{$ne:true}  }).collation( { locale: 'en', strength: 2 } );
	} else if (birth !==undefined){
      getList = Participant.find({ birthdate: birth,lapScore:{$ne:true}  });
	} else if (bibNo !== undefined){
    getList = Participant.find({ bibNo: bibNo  });
  }
	 else if (dbID !== undefined){
    getList = Participant.find({ _id: dbID  });
  }
	else if (onTeam !== undefined){
    getList = Participant.find({ teamID: onTeam  });
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
      getPerson(getList,res)
    //return res.status(401).send(invalidToken);
  }
});

// Endpoint for POSTing new registrations to participant db
app.post('/registration', (req, res) => {
    var key = req.headers.k
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

//timing Endpoint
app.post('/timing', (req, res) => {
    var key = req.headers.k
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

//get rope climb times Endpoint
app.get('/timing', (req, res) => {
	Scoring.find({$and:[ { tiebreaker: { $ne: 999.99 } }, { tiebreaker: { $gt: 0 } } ] } ).sort( { tiebreaker: 1 } ).then((participants) => {
		res.send({participants});
	}, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
})

//get rope climb times Endpoint
app.get('/scoring/participants/tiebreaker', (req, res) => {
	Scoring.find({$and:[ { tiebreaker: { $ne: 999.99 } }, { tiebreaker: { $gt: 0 } } ] } ).sort( { tiebreaker: 1 } ).then((participants) => {
		res.send({participants});
	}, (e) => {
    console.log(e);
    res.status(400).send(e);
    });
})

app.get('/teams', (req, res) => {
	var team = req.query.id
	if (team === undefined ) {
	Participant.aggregate(
            [            	{
			"$match": {"teamID": { "$exists": true, "$nin": [ null, "" ] },
						"heat": { "$exists": true, "$nin": [ null, "" ] }}},
                {"$group": { "_id":{ teamID: "$teamID", heat: "$heat"  },
                   "count":  {"$sum":1}}}
            ]
        )
	.then((teams) => {
		res.send({teams});
	}, (e) => {
		console.log(e);
		res.status(400).send(e);
    });
	} else {
		Participant.find({teamID: team}).then((result) => {
		if (!result || result.length == 0) {
			return res.status(404).send(status404);
		} else {
		Participant.aggregate(
            [{
				"$match": {
                    "teamID": team
                    }
				},
                {"$group": { "_id":{ teamID: "$teamID", heat: "$heat"  },
                   "count":  {"$sum":1}}}
            ]
        )
	.then((teams) => {
		res.send({teams});
	}, (e) => {
		console.log(e);
		res.status(400).send(e);
			});
		}
	  })
	}
})

//should be PUT /registration
app.post('/registrationupdate', (req, res) => {
	var body = req.body


	if (body.bibNo){
		if (body.teamID){

			var update = {'bibNo':body.bibNo,'teamID':body.teamID,'gender': body.gender,'birthdate':body.birthday,'group':body.group}
		} else {

			var update = {'bibNo':body.bibNo,'gender': body.gender,'birthdate':body.birthday,'group':body.group}
		}
	} else {
		if (body.teamID){

			var update = {'teamID':body.teamID,'gender': body.gender,'birthdate':body.birthday,'group':body.group}
		} else {

			var update = {'gender': body.gender,'birthdate':body.birthday,'group':body.group}
		}
	}
	//var update = {'gender': body.gender,'birthdate':body.birthday,'group':body.group}


	Participant.findByIdAndUpdate(body.id, update, {new: true}).then((doc) => {
		var successfulPost = ({
			message: 'updated'
		});
		//console.log(doc)
			return res.status(200).send(successfulPost);
	}).catch((e) => {
		console.log('Something went wrong trying to update a registration.');
	})
})

app.post('/scoringupdate', (req, res) => {
	var body = req.body
	//calculate points
	var points = 0
	var tier = body.tier;
	if (body.success == true && body.countScore == true){
		if (tier ==1){
			points =1
		}
		if (tier == 2){
			points = 3
		}
		if (tier == 3){
			points = 5
		}

	} else {
		points = 0
	}
	//end point value
	var update = {'obstID':body.obstID,'tier':body.tier,'success': body.success,'countScore':body.countScore, 'points':points}
	//console.log(update)
	eventResults.findByIdAndUpdate(body.id, update, {new: true}).then((doc) => {
		var successfulPost = ({
			message: 'updated'
		});

			updateScore(body.bibNo)
		//console.log(doc)
			return res.status(200).send(successfulPost);
	}).catch((e) => {
		console.log('Something went wrong trying to update a registration.');
	})
})

app.post('/groupupdate', (req, res) => {
	var body = req.body
	var update = {'gender':body.gender,'group': body.group}

	Scoring.findByIdAndUpdate(body.id, update, {new: true}).then((doc) => {
		var successfulPost = ({
			message: 'updated'
		});

			updateScore(body.bibNo)
		//console.log(doc)
			return res.status(200).send(successfulPost);
	}).catch((e) => {
		console.log('Something went wrong trying to update a Score.');
	})
})

app.get('/endofracebutton', (req, res) => {
	var key = req.query.k

	if (key !==undefined) {
		var tokenCheck = checkAuth(key);
		tokenCheck.then((token) => {

				if (token ===false){
					return res.status(401).send(invalidToken);
				} else {
					//TODO: this overwrites the g8-ers; it shouldnt.
					Scoring.updateMany({}, {$set: {progress: "Course Complete", obstaclesCompleted: Number(process.env.totalObstacleCount), next: 99.0}}).then((doc) => {
						console.log(doc)
						teamScoring.updateMany({}, {$set: {onCourse: 0}}).then((teamDoc) => {
							// TODO: {url}/oncourse is actually looking at {startTime:{$exists:true},finishTime:{$exists:false}}. You would need to update the finish time of these records with the race complete timestamp.
							var successfulPost = ({
								message: 'Race day complete.'
							});


							console.log(teamDoc)
								return res.status(200).send(successfulPost);
						}).catch((e) => {
							console.log('Something went wrong trying to close out race day.');
						})

							//return res.status(200).send(successfulPost);
					}).catch((e) => {
						console.log('Something went wrong trying to close out race day.');
					})
				}
		}).catch((e) => {
			res.status(500).send(e);
			})

		;}
		else {
		return res.status(401).send(invalidToken);
	}
})

app.get('/oncourse', (req, res) => {
Participant.count({startTime:{$exists:true},finishTime:{$exists:false}}).then((doc) => {
	var successfulPost = ({
		onCourse: doc
	});
		return res.status(200).send(successfulPost);
}).catch((e) => {
	res.status(500).send(e);
	})
})

app.get('/obstacle-details', (req, res) => {
obstacles.find({}).then((obstacle) => {
		return res.status(200).send({obstacle});
}).catch((e) => {
	res.status(500).send(e);
	})
})

// Binds the root directory to display html results page
app.use('/', express.static(path.join(__dirname, 'reporting')))

// Binds the root directory to display html individual results page
app.use('/individual', express.static(path.join(__dirname, 'individual')))

// Binds the root directory to display html admin page
app.use('/admin', express.static(path.join(__dirname, 'admin')))

// Binds the root directory to display html admin page
app.use('/update-reg', express.static(path.join(__dirname, 'registrationupdate')))

// Binds the root directory to display html admin page
app.use('/scoringadmin', express.static(path.join(__dirname, 'scoringadmin')))

// Binds the root directory to display html admin page
app.use('/update-score', express.static(path.join(__dirname, 'scoringupdate')))

// Binds the root directory to display html admin page
app.use('/update-group', express.static(path.join(__dirname, 'groupupdate')))



app.listen(port, () => {
  console.log(`API running on port: ${port}`);
	countObstacles();
	console.log(Date.now());
});



module.exports = {app};
