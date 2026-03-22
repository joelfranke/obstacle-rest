module.exports = function createTimingService(deps){
  var Participant = deps.Participant;
  var timeDate = deps.timeDate;
  var updateScore = deps.updateScore;

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

  return {logTime};
}

