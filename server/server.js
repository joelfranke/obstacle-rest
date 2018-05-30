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


 // function allScores(){
	//  eventResults.distinct("bibNo").then((event) => {
	// 	 var uniqueBib = event.length;
	// 	 for(var bib in event){
	// 		 updateScore(event[bib])
	// 	 }
	//  })
 //
 // }


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

							//console.log(doc)
							}, (e) => {
										console.log(e);
										//log the error
							});

							}

						}, (e) => {
									console.log(e);
									//log the error
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
      console.log(bibNo, 'Invalid bibNo passed to scoring function')
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
									group: group,
                 bibNo: personBib,
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
								 tiebreaker: 999.99
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
			if (tiebreaker){
				update = {'updatedOn': timestamp,'tiebreaker':tiebreaker}
				//console.log(bibNo,update);
			} else {
				update = {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'progress':progress, 'next': next,'obstaclesCompleted':totEvents, "isDavid":isDavid}
			}
			//Scoring.findOneAndUpdate({ bibNo:bibNo }, { $set: {'g1':g1,'g2':g2,'g3':g3,'score':totScore,'updatedOn': timestamp,'progress':progress, 'next': next}} , {returnNewDocument : true}).then((doc) => {
			Scoring.findOneAndUpdate({ bibNo:bibNo }, { $set: update} , {returnNewDocument : true}).then((doc) => {

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
			if (isDavid === true){
				//console.log('david check in progress')
				 if (body.success === false || body.tier !== 3){
					 Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
						 updateScore(bibNo)
				}).catch((e) => {
						 console.log('Something went wrong.');
					 })
				 } else{
					 updateScore(bibNo)
				 }
			} else {
				updateScore(bibNo)
			}

			//updateScore(bibNo)
			// end
            res.send(successfulPost);
          }, (e) => {
            console.log(e);
            res.status(400).send(e);
          });
        });
				// test if this if firing
				// update david flag move up to within "obstResults.save().then((doc) => {" and move updateScore to within the participant arrow function
              if (isDavid === true){
							//	console.log('david check in progress')
                 if (body.success === false || body.tier !== 3){
                   Participant.findByIdAndUpdate(id, {isDavid: false}, {new: true}).then((participant) => {
                }).catch((e) => {
                     console.log('Something went wrong.');
                   })
                 }
              } else {

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
      var time = body.deviceTime;
      var firstName = participant.firstName;
      var isDavid = participant.isDavid;
	  	var bibFromBand = body.bibFromBand;
			var heat = participant.heat;
			var ropeTime = body.time;

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
           update = {'tiebreaker.deviceTime': time, 'tiebreaker.bibFromBand':bibFromBand,'tiebreaker.timestamp':timestamp, 'tiebreaker.time':ropeTime};
         } else {
           res.status(400).send(e);
         }
         //console.log(update);
         //no duplicate handling, will need to be added here
				 // issue with time vs timestamp vs body.time from POST request
         Participant.findOneAndUpdate({ bibNo:bibNo }, { $set: update }, {returnNewDocument : true}).then((participant) => {
           if (participant){
			   		if(time){
							//console.log(bibNo,time)
								updateScore(bibNo,ropeTime)
						}

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

		 //Add res.status(409).(alreadyRegistered) if (preregistered.bibNo.length >0 or not null as precondition)

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
		var ranks = req.query.ranks

  if (gender !==undefined) {
	// get by gender
  Scoring.find({ gender: gender}).limit( 25 ).sort( { score: -1, tiebreaker: 1  } ).then((participantScores ) => {
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
				//if (ranks == 'true'){
					// UPDATE THIS
					//teamScoring.find().sort( { score: -1  } ).then((teamScores) => {
			teamScoring.aggregate([
			{ $sort: { score: -1 } },
			{
					"$group": {
							"_id": false,
							"team": {
									"$push": {
											"_id":"$_id",
											"teamID": "$teamID",
											"score": "$score",
											"g1": "$g1",
											"g2": "$g2",
											"g3": "$g3",
											"onCourse": "$onCourse",
									}
							}
					}
			},
			{
					"$unwind": {
							"path": "$team",
							"includeArrayIndex": "rank"
					}
			},
			{
				 "$match": {
				      "team.teamID": team
					}
			}
		]).then((withRanks) => {
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

				//console.log(teamScores)
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
			next: { $gte: 5 }
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
													//console.log(groupRank,groupRankCount)
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
														participant:participant,
														rank:rank,
														rankCount:rankCount,
														sexRank:sexRank,
														sexRankCount:sexRankCount,
														groupRank:groupRank,
														groupRankCount:groupRankCount

													 }]

													//console.log(participantScores)
													//send results
													res.send({participantScores})


												}, (e) => {
													console.log(e);
												})


										}, (e) => {
											console.log(e);
										})
									// var participantScores = [{
									// 	_id: withRanks[0].team._id,
									// 	 g1: withRanks[0].team.g1,
									// 	 g2: withRanks[0].team.g2,
									// 	 g3: withRanks[0].team.g3,
									// 	 score: withRanks[0].team.score,
									// 	 onCourse: withRanks[0].team.onCourse,
									// 	 teamID: withRanks[0].team.teamID,
									// 	 rank: rankOffset
									// }]

									//console.log(teamScores)
									//send results
									//res.send({teamScores});
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
	  // get all and send
  Scoring.find().sort( { score: -1, tiebreaker:1 } ).then((participantScores) => {
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
	var qLastName = req.query.lastName
  var birth = req.query.bday
  var bibNo = req.query.bibNo
	var onTeam = req.query.onTeam
  var key = req.query.k

	if (qLastName !==undefined){
      getList = Participant.find({ lastName: qLastName  }).collation( { locale: 'en', strength: 2 } );
	} else if (birth !==undefined){
      getList = Participant.find({ birthdate: birth  });
	} else if (bibNo !== undefined){
    getList = Participant.find({ bibNo: bibNo  });
  }
	else if (onTeam !== undefined){
    getList = Participant.find({ teamID: onTeam  });
  }
	// //temp function, remove!
	// else if (rb == 'true'){
	// 	allScores()
	// 	return res.status(200).send({message: 'scoring calc in progress'});
	// }
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
''
