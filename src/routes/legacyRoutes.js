module.exports = function registerLegacyRoutes(app, deps) {
  const {
    Participant,
    eventResults,
    obstacles,
    team,
    Scoring,
    teamScoring,
    timeDate,
    dupeResults
  } = deps;

  // Keep legacy error objects as ar so the extracted code's own ar status404 = ... redeclarations don't crash.
  var status404 = deps.status404;
  var invalidToken = deps.invalidToken;

  // Auth + scoring handlers are functions with closures over the legacy models inside src/app.js.
  var checkAuth = deps.checkAuth;
  var updateScore = deps.updateScore;
  var logEvent = deps.logEvent;
  var logTime = deps.logTime;
  var registration = deps.registration;
  var getPerson = deps.getPerson;
  var countObstacles = deps.countObstacles;
  var computeG8TotalsFromEvents = deps.computeG8TotalsFromEvents;

  function mapJsonObstacleToDb(jsonObstacle) {
    var update = {};

    if (jsonObstacle.sequence !== undefined && jsonObstacle.sequence !== null) {
      update.sequence = Number(jsonObstacle.sequence);
    }
    if (jsonObstacle.coordinate !== undefined) {
      update.coordinate = jsonObstacle.coordinate;
    }
    if (jsonObstacle.version !== undefined) {
      update.version = jsonObstacle.version;
    }
    if (jsonObstacle.attemptsAllowed !== undefined) {
      update.attemptsAllowed = jsonObstacle.attemptsAllowed;
    }
    if (jsonObstacle.rules !== undefined) {
      update.rules = jsonObstacle.rules;
    }
    if (jsonObstacle.sponsor !== undefined) {
      update.sponsor = jsonObstacle.sponsor;
    }
    if (jsonObstacle.obstacleDescription !== undefined) {
      update.description = jsonObstacle.obstacleDescription;
    } else if (jsonObstacle.description !== undefined) {
      update.description = jsonObstacle.description;
    }
    if (jsonObstacle.recordable !== undefined) {
      update.scored = jsonObstacle.recordable;
    } else if (jsonObstacle.scored !== undefined) {
      update.scored = jsonObstacle.scored;
    }

    return update;
  }

  function coordinatesEqual(a, b) {
    if (!a && !b) return true;
    if (!a || !b || a.length < 2 || b.length < 2) return false;
    return Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1]);
  }

  function getExistingDescription(existing) {
    if (existing.description !== undefined && existing.description !== null) {
      return existing.description;
    }
    if (existing.obstacleDescription !== undefined && existing.obstacleDescription !== null) {
      return existing.obstacleDescription;
    }
    return '';
  }

  function getExistingRecordable(existing) {
    if (existing.scored !== undefined) {
      return Boolean(existing.scored);
    }
    if (existing.recordable !== undefined) {
      return Boolean(existing.recordable);
    }
    return true;
  }

  function buildFieldsToUpdate(existing, jsonObstacle) {
    var update = mapJsonObstacleToDb(jsonObstacle);
    var fieldsToUpdate = {};

    if (update.sequence !== undefined && Number(existing.sequence) !== Number(update.sequence)) {
      fieldsToUpdate.sequence = update.sequence;
    }
    if (update.coordinate !== undefined && !coordinatesEqual(existing.coordinate, update.coordinate)) {
      fieldsToUpdate.coordinate = update.coordinate;
    }
    if (update.rules !== undefined && (existing.rules || '') !== update.rules) {
      fieldsToUpdate.rules = update.rules;
    }
    if (update.description !== undefined && getExistingDescription(existing) !== update.description) {
      fieldsToUpdate.description = update.description;
      fieldsToUpdate.obstacleDescription = update.description;
    }
    if (update.scored !== undefined && getExistingRecordable(existing) !== Boolean(update.scored)) {
      fieldsToUpdate.scored = update.scored;
      fieldsToUpdate.recordable = update.scored;
    }

    return fieldsToUpdate;
  }

  function buildNewObstacleDocument(jsonObstacle) {
    var doc = mapJsonObstacleToDb(jsonObstacle);
    doc.name = jsonObstacle.name;
    if (doc.attemptsAllowed === undefined) {
      doc.attemptsAllowed = 1;
    }
    if (doc.scored === undefined) {
      doc.scored = true;
      doc.recordable = true;
    } else {
      doc.recordable = doc.scored;
    }
    if (doc.description !== undefined) {
      doc.obstacleDescription = doc.description;
    }
    if (doc.coordinate === undefined) {
      doc.coordinate = jsonObstacle.coordinate || null;
    }
    return doc;
  }

  
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

function parsePositiveLimit(req, fallback, max) {
  var n = parseInt(req.query.limit, 10);
  if (isNaN(n) || n <= 0) return fallback;
  return Math.min(n, max);
}

function uniqueBibsFromResults(rows) {
  var seen = {};
  var bibs = [];
  rows.forEach(function (row) {
    var bib = row.bibNo;
    if (bib != null && !seen[bib]) {
      seen[bib] = true;
      bibs.push(bib);
    }
  });
  return bibs;
}

function enrichResultsWithScores(participantResults, callback, errorCallback) {
  var bibs = uniqueBibsFromResults(participantResults);
  if (bibs.length === 0) {
    return callback(participantResults);
  }
  Scoring.find({ bibNo: { $in: bibs } }).then((scores) => {
    var byBib = {};
    scores.forEach(function (score) {
      byBib[score.bibNo] = score;
    });
    var enriched = participantResults.map(function (row) {
      var obj = typeof row.toObject === 'function' ? row.toObject() : row;
      if (obj._id != null) obj._id = String(obj._id);
      var score = byBib[obj.bibNo];
      if (score) {
        obj.firstName = score.firstName;
        obj.lastName = score.lastName;
        obj.totalScore = score.score;
        obj.teamID = score.teamID;
        obj.progress = score.progress;
      }
      return obj;
    });
    callback(enriched);
  }, errorCallback);
}

function sendEventResults(req, res) {
  var delta = req.query.d;
  var _id = req.query.id;
  var recent = req.query.recent;

  if (delta !== undefined) {
    eventResults.find({ resultID: { $gt: delta } }).then((participantResults) => {
      res.send({participantResults});
    }, (e) => {
      console.log(e);
      res.status(400).send(e);
    });
  } else if (_id !== undefined) {
    eventResults.find({ _id: _id }).then((participantResults) => {
      res.send({participantResults});
    }, (e) => {
      console.log(e);
      res.status(400).send(e);
    });
  } else if (recent === 'true') {
    var n = parsePositiveLimit(req, 50, 200);
    eventResults.find().sort({ resultID: -1 }).limit(n).then((participantResults) => {
      enrichResultsWithScores(participantResults, function (enriched) {
        res.send({ participantResults: enriched });
      }, function (e) {
        console.log(e);
        res.send({ participantResults: participantResults });
      });
    }, (e) => {
      console.log(e);
      res.status(400).send(e);
    });
  } else {
    eventResults.find().then((participantResults) => {
      res.send({participantResults});
    }, (e) => {
      console.log(e);
      res.status(400).send(e);
    });
  }
}

//Complete GET ALL results
// includes logic to send delta results based on an optional query value "q"
// recent=true returns the newest recordings (optional limit, default 50)
app.get('/results', sendEventResults);

//Complete GET ALL results
// includes logic to send delta results based on an optional query value "q"
app.get('/scoring/results', sendEventResults);
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
				var g8 = individualScores.g8
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
									if (!totalRank || totalRank.length === 0) {
										return res.status(404).send(status404);
									}
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
														g8:g8,
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
	Scoring.find({
		progress: 'Course Complete',
		lapScore: { $ne: true }
	}).sort( { updatedOn: -1 } ).limit( n ).then((participantScores) => {
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
	Scoring.find({
		progress: 'Course Complete',
		lapScore: { $ne: true }
	}).sort( { updatedOn: -1 } ).limit( n ).then((participantScores) => {
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
				var g8 = individualScores.g8
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
									if (!totalRank || totalRank.length === 0) {
										return res.status(404).send(status404);
									}
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
														g8:g8,
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

// G8 leaderboard API (used by the G8 dashboard UI)
app.get('/api/scoring/g8', (req, res) => {
	Promise.all([
		Scoring.find({ g8: true }).lean().exec(),
		eventResults.find({ g8: true }).sort({ bibNo: 1, lapCount: 1, obstID: 1, points: -1 }).lean().exec()
	]).then(([scoringRows, allEvents]) => {
		var eventsByBib = {};
		for (var i = 0; i < allEvents.length; i++) {
			var ev = allEvents[i];
			if (!eventsByBib[ev.bibNo]) {
				eventsByBib[ev.bibNo] = [];
			}
			eventsByBib[ev.bibNo].push(ev);
		}

		var participantScores = scoringRows.map(function(row) {
			var events = eventsByBib[row.bibNo] || [];
			var totals = computeG8TotalsFromEvents(events);
			return {
				bibNo: row.bibNo,
				firstName: row.firstName,
				lastName: row.lastName,
				group: row.group,
				gender: row.gender,
				g1: totals.g1,
				g2: totals.g2,
				g3: totals.g3,
				score: totals.score,
				obstaclesCompleted: totals.obstaclesCompleted
			};
		}).sort(function(a, b) {
			return b.score - a.score;
		});

		res.send({ participantScores: participantScores });
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

function raceCloseTimestamp() {
	var closedAt = timeDate.format(new Date(), 'h:mm:ss A');
	return closedAt.replace('a.m.', 'AM').replace('p.m.', 'PM');
}

// A missing time, a null parent, or a schema default of { deviceTime: null } is not a real scan.
function hasNoDeviceTime(field) {
	return { [field + '.deviceTime']: { $in: [null, ''] } };
}

app.get('/endofracebutton', (req, res) => {
	var key = req.query.k

	if (key !==undefined) {
		var tokenCheck = checkAuth(key);
		tokenCheck.then((token) => {

				if (token ===false){
					return res.status(401).send(invalidToken);
				} else {
					var closedAt = raceCloseTimestamp();
					var scoreUpdate = { progress: 'Course Complete', next: 99.0 };
					var obstacleCount = Number(process.env.totalObstacleCount);
					if (isFinite(obstacleCount)) {
						scoreUpdate.obstaclesCompleted = obstacleCount;
					}
					// g8:false misses scores where g8 was never set. $ne:true includes those.
					// Checked-in athletes without a start or finish scan (including G8) get a
					// closeout time so Race Day counts them started and finished.
					var checkedIn = { bibNo: { $ne: null } };
					Promise.all([
						Scoring.updateMany(
							{ g8: { $ne: true } },
							{ $set: scoreUpdate }
						),
						Participant.updateMany(
							Object.assign({}, checkedIn, hasNoDeviceTime('startTime')),
							{ $set: { startTime: { deviceTime: closedAt, bibFromBand: false } } }
						),
						Participant.updateMany(
							Object.assign({}, checkedIn, hasNoDeviceTime('finishTime')),
							{ $set: { finishTime: { deviceTime: closedAt, bibFromBand: false } } }
						),
						teamScoring.updateMany({}, { $set: { onCourse: 0 } })
					]).then((results) => {
						console.log(results);
						return res.status(200).send({
							message: 'Race day complete.'
						});
					}).catch((e) => {
						console.log('Something went wrong trying to close out race day.');
						console.log(e);
						return res.status(500).send(e);
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

app.get('/analytics', (req, res) => {
//Participant.countDocuments({startTime:{$exists:true},finishTime:{$exists:false}}).then((registrations) => {
Participant.countDocuments({}).then((registrations) => {
	console.log(registrations)
	Participant.countDocuments({bibNo:{$ne:null}}).then((checkins) => {
		console.log(checkins)
		//Participant.countDocuments({_id : { $gt : ObjectId(Math.floor(new Date(new Date().getFullYear()+'/'+(new Date().getMonth()+1)+'/'+new Date().getDate())/1000).toString(16)+"0000000000000000") }}).then((newRegistrations) => {
    				Participant.countDocuments({}).then((newRegistrations) => {
						//registrations = total registered including new, onsite registrations
						console.log(newRegistrations)
						var checkedInPercent = (checkins/registrations)*100
						Participant.countDocuments({ bibNo: { $ne: null }, 'finishTime.deviceTime': { $nin: [null, ''] } }).then((checkedInFinished) => {
							Participant.countDocuments({ bibNo: { $ne: null }, 'startTime.deviceTime': { $nin: [null, ''] } }).then((checkedInStarted) => {
								var checkedInFinishedPercent = checkedInStarted > 0
									? (checkedInFinished / checkedInStarted) * 100
									: 0;
								var successfulPost = ({
									registered: registrations,
									checkedIn: checkins,
									newRegistrations: newRegistrations,
									checkedInPercent: checkedInPercent,
									checkedInFinished: checkedInFinished,
									checkedInStarted: checkedInStarted,
									checkedInFinishedPercent: checkedInFinishedPercent
								});
								return res.status(200).send(successfulPost);
							}).catch((e) => {
								console.log('This fails in the checked-in started query')
								res.status(500).send(e);
							})
						}).catch((e) => {
							console.log('This fails in the checked-in finished query')
							res.status(500).send(e);
						})
													}).catch((e) => {
														console.log('This fails in the new registration query')
														res.status(500).send(e);
														})
												}).catch((e) => {
													console.log('This fails in the get checkins query')
												res.status(500).send(e);
												})
						}).catch((e) => {
							console.log('This fails in the first query')
							res.status(500).send(e);
				})
})

app.post('/obstacle-import', (req, res) => {
	var body = req.body;
	var obstacleList = body.obstacle;

	if (!Array.isArray(obstacleList)) {
		return res.status(400).send({ message: 'Expected obstacle array in request body.' });
	}

	var results = [];

	obstacles.find({}).then((existingObstacles) => {
		var byName = {};
		for (var i = 0; i < existingObstacles.length; i++) {
			byName[existingObstacles[i].name] = existingObstacles[i];
		}

		var updatePromises = obstacleList.map((jsonObst) => {
			if (!jsonObst || !jsonObst.name) {
				return Promise.resolve({ name: '', status: 'skipped', message: 'Missing name' });
			}

			var existing = byName[jsonObst.name];
			if (!existing) {
				var newDoc = buildNewObstacleDocument(jsonObst);
				return obstacles.create(newDoc).then(() => {
					return { name: jsonObst.name, status: 'added' };
				});
			}

			var fieldsToUpdate = buildFieldsToUpdate(existing, jsonObst);

			if (Object.keys(fieldsToUpdate).length === 0) {
				return Promise.resolve({ name: jsonObst.name, status: 'unchanged' });
			}

			return obstacles.findByIdAndUpdate(existing._id, fieldsToUpdate, { new: true }).then(() => {
				return {
					name: jsonObst.name,
					status: 'updated',
					fields: Object.keys(fieldsToUpdate)
				};
			});
		});

		return Promise.all(updatePromises).then((updateResults) => {
			results = updateResults;
			if (countObstacles) {
				countObstacles();
			}
			return res.status(200).send({ results: results });
		});
	}).catch((e) => {
		console.log('Something went wrong trying to import obstacles.');
		res.status(500).send(e);
	});
})

app.get('/obstacle-details', (req, res) => {
obstacles.find({}).then((obstacle) => {
		return res.status(200).send({obstacle});
}).catch((e) => {
	res.status(500).send(e);
	})
})
}

