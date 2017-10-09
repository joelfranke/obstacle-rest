var aggJSON = [];
var aggIndvJSON = [];

var obstIndex = [{obstID: 1, value: "Water Carry"},
    {obstID: 2, value: "Ninja Killer"},
    {obstID: 3, value: "Hangman"},
    {obstID: 4, value: "Half Dome"},
    {obstID: 5, value: "Balancing Act"},
    {obstID: 6, value: "Leap of Faith"},
    {obstID: 7, value: "Slippery Wall Monkey"},
    {obstID: 8, value: "Sclae the Walls"},
    {obstID: 9, value: "Circus Maximus"},
    {obstID: 10, value: "Skyclimb"},
    {obstID: 11, value: "Rope Cross"},
    {obstID: 12, value: "Over the Moon"}
];


function getResults(participantID,callback) {
  var jsonData = "https://blooming-ridge-76065.herokuapp.com/results/" + participantID;
  var personData = "https://blooming-ridge-76065.herokuapp.com/participant/" + participantID;

  $.getJSON( personData, function( personJson ) {
    var teamID = personJson.participant.teamID;
    if (teamID !== null && teamID !== ""){
      var participantName = "<b>"+personJson.participant.lastName + ', ' + personJson.participant.firstName+"</b> ("+personJson.participant.teamID+")";
    } else {
      var participantName = "<b>"+personJson.participant.lastName + ', ' + personJson.participant.firstName+"</b>"
    }
      var participantDiv = document.getElementById('participant-div');
      participantDiv.innerHTML += participantName;
  });

  $.getJSON( jsonData, function( json ) {

    for (var item in json.results) {

      var obstID = json.results[item].obstID;
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

      var tier = json.results[item].tier;
      var deviceTime = json.results[item].deviceTime;
      var success = json.results[item].success;
      //update to include invidual score
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
  console.log(aggIndvJSON);
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
//0.4sec delay hardcoded to allow person results to load
getResults(participantID,function(){
  setTimeout(function(){
    createPage(aggIndvJSON);
}, 500);

});
//results reload every two minutes (120000ms)
var i = setInterval(function() { location.reload(); }, 120000);
