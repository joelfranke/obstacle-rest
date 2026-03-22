module.exports = function createEventService(deps){
  var Participant = deps.Participant;
  var eventResults = deps.eventResults;
  var dupeResults = deps.dupeResults;
  var timeDate = deps.timeDate;
  var updateScore = deps.updateScore;
  var getNextSequence = deps.getNextSequence;

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

  return {logEvent};
}

