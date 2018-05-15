var aggJSON = [];
var aggIndvJSON = [];

var obstIndex = [{obstID: 1, value: "Water Carry"},
    {obstID: 2, value: "Ninja Killer"},
    {obstID: 3, value: "Hangman"},
    {obstID: 4, value: "Half Dome"},
    {obstID: 5, value: "Balancing Act"},
    {obstID: 6, value: "Leap of Faith"},
    {obstID: 7, value: "Slippery Wall Monkey"},
    {obstID: 8, value: "Scale the Walls"},
    {obstID: 9, value: "Circus Maximus"},
    {obstID: 10, value: "Skyclimb"},
    {obstID: 11, value: "Rope Cross"},
    {obstID: 12, value: "Over the Moon"}
];


function getResults(participantID,callback) {
  var jsonData = "/results/" + participantID;
  var personData = "/participant?k=04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3&bibNo=" + participantID;

  $.getJSON( personData, function( personJson ) {

    var personData = personJson.participants[0];
    var teamID = personData.teamID;
    if (teamID !== null && teamID !== ""){
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b> ("+personData.teamID+")";
    } else {
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b>"
    }
      var participantDiv = document.getElementById('participant-div');
      participantDiv.innerHTML += participantName;
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
