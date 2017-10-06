var aggJSON = [];
var aggIndvJSON = [];
function getResults(participantID,callback) {
  var jsonData = "http://blooming-ridge-76065.herokuapp.com/results/" + participantID;
  var personData = "http://blooming-ridge-76065.herokuapp.com/participant/" + participantID;

  $.getJSON( personData, function( personJson ) {
    var teamID = personJson.participant.teamID;
    if (teamID != null || teamID !=""){
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
      var tier = json.results[item].tier;
      var deviceTime = json.results[item].deviceTime;
      var success = json.results[item].success;
      var indivResultArray = [];
      indivResultArray.push(obstID,tier,success,deviceTime);
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
          order: [[3 , "desc" ]],
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
              { title: "Success" },
              { title: "Time" }
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
}, 1400);

});
//results reload every two minutes (120000ms)
var i = setInterval(function() { location.reload(); }, 120000);
