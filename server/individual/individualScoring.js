var aggJSON = [];
var aggIndvJSON = [];

var obstIndex = [{obstID: 1, value: "Water Carry"},
    {obstID: 2, value: "Ninja Killer"},
    {obstID: 3, value: "Hangman"},
    {obstID: 4, value: "Leap of Faith"},
    {obstID: 5, value: "Balancing Act"},
    {obstID: 6, value: "Half Dome"},
    {obstID: 7, value: "Rope Cross"},
    {obstID: 8, value: "Slippery Wall Monkey"},
    {obstID: 9, value: "Circus Maximus"},
    {obstID: 10, value: "Skyclimb"},
    {obstID: 11, value: "The Destroyer"},
    {obstID: 12, value: "Over the Moon"}
];


function getResults(participantID,callback) {
  var jsonData = "/results/" + participantID;
   var personData = "/scoring/?bibNo=" + participantID;

  $.getJSON( personData, function( personJson ) {
	 

    var personData = personJson.participantScores[0];
    var teamID = personData.teamID;
	var gender
    if (teamID !== null && teamID !== ""){
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b> ("+personData.teamID+")";
    } else {
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b>"
    }
      var participantDiv = document.getElementById('participant-div');
      participantDiv.innerHTML += participantName;
	  if (personData.gender == "M"){
		  gender = "Male"
	  } else {
		  gender = "Female"
	  }
	  var rank = "Rank: " + personData.rank +"/"+personData.rankCount
	  var sexRank = gender + " Rank: " + personData.sexRank +"/"+personData.sexRankCount
	  var groupRank = " Group Rank: " + personData.groupRank +"/"+personData.groupRankCount +" (" + personData.group + ")"
	  var score = Math.round(personData.score)
	  
	  console.log(personData)
	  console.log(score,rank, sexRank,groupRank)
	  
	  var pointsDiv = document.getElementById('participant-points-div');
      pointsDiv.innerHTML += score +'<br>' ;
	   var ranksDiv = document.getElementById('participant-ranks-div');
      ranksDiv.innerHTML += rank +'<br>' + sexRank+'<br>'+groupRank+'<br>' +'<br>';
  });

  $.getJSON( jsonData, function( json ) {

    for (var item in json.participantResults) {

      var obstID = json.participantResults[item].obstID;
      //testing
      var obstName;

      Object.keys(obstIndex).forEach(function (key)
        {
          if(obstIndex[key].obstID == obstID){
            obstName = obstIndex[key].value;
            //need to pass obstName to the obstName callback
          }
        });
      obstName = obstID + ". "+ obstName
      // end testing

      var tier = json.participantResults[item].tier;
      var deviceTime = json.participantResults[item].deviceTime;
      var success = json.participantResults[item].success;
      //update to include individual score
      if (success == true){
        success = 	"&#x2714;"
      } else {
        success = "&#x2715;"
      }
      var indivResultArray = [];
      indivResultArray.push(obstName,tier,success,deviceTime);
      aggIndvJSON.push(indivResultArray);
    }
  })
  callback(aggIndvJSON);
}
  

function createPage (aggIndvJSON){

  $(document).ready (function() {
      $('#results').DataTable( {
          data: aggIndvJSON,
          scrollY: "500px",
          scrollCollapse: true,
          order: [[3 , "asc" ]],
          bStateSave: true,
          paging: false,
          processing: true,
          retrieve: true,
          deferRender: true,
          language: {
            emptyTable: "No results recorded"
          },
          columns: [
              { title: "Obstacle" },
              { title: "Tier" },
              { title: "Result" },
              { title: "Time completed" }
          ]
      });
    });

}
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var participantID = getParameterByName('id');
//0.5sec delay hardcoded to allow person results to load
getResults(participantID,function(){
  setTimeout(function(){
    createPage(aggIndvJSON);
}, 500);

});
//results reload every two minutes (120000ms)
var i = setInterval(function() { location.reload(); }, 120000);
//var i = setInterval(getResults(), 5000);
