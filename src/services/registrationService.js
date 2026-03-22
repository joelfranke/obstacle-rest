module.exports = function createRegistrationService(deps){
  var Participant = deps.Participant;

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

  return {registration};
}

