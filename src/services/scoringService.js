module.exports = function createScoringService(deps){
  var obstacles = deps.obstacles;
  var Participant = deps.Participant;
  var Scoring = deps.Scoring;
  var teamScoring = deps.teamScoring;
  var eventResults = deps.eventResults;

	function countObstacles(){
		obstacles.find({scored:{$ne:false}}).then((obstacles) => {
			var obstacleCount = JSON.stringify(obstacles.length)
			process.env.totalObstacleCount = obstacleCount
				 console.log(`There are: ${process.env.totalObstacleCount} obstacles.`)
		}, (e) => {
	    console.log('trouble with obstacle count calculation')
	  });
	}
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

                 	progress = totEvents + `/${process.env.totalObstacleCount}`;
								 	next = totEvents + 1
               	}
						 	} else {
								//for g8 just take the total number of scans
									totEvents = events.length
									//progress = totEvents + `/${process.env.totalObstacleCount}`;
									progress = totEvents + `/??`;
									//is this logic used in the app?
									//should we make this be some sort of tracker for g8s?
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

  return {countObstacles, updateTeamScore, updateScore};
}

