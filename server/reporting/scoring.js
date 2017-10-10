var aggJSON = [];

function getResults(callback) {

  var jsonData = "https://blooming-ridge-76065.herokuapp.com/results";

	d3.json(jsonData, function(data) {
	var nested_data = d3.nest()
	.key(function(d) { return d.bibNo; })
	.key(function(d) { return d.tier; })
  // below aggregates on whether success or not and returns relevant (true/false) object
  // will need to parse this and write in only successes
  .key(function(d) { return d.success; })
	.rollup(function(leaves) { return leaves.length; })
	.entries(data.results);

for (var item in nested_data) {
  var bib = nested_data[item].key;
  var tierArray = nested_data[item].values

  var g1 = 0;
  var g2 = 0;
  var g3 = 0;
  var totEvents = 0;
  var totScore = 0;
    for(var tierItem in tierArray){
      var tierKey = tierArray[tierItem].key;
      var tierValue = tierArray[tierItem].values;
      //console.log(tierKey, JSON.stringify(tierValue));
        //testing
        for(var testItem in tierValue){

          var resultSuccess = tierValue[testItem].key;
          var tierScore = tierValue[testItem].values;

          if (resultSuccess === 'true') {
            if (tierKey != null && tierKey == 1){
              g1 = tierScore;
            }
            if (tierKey != null && tierKey == 2){
              g2 = tierScore;
            }
            if (tierKey != null && tierKey == 3){
              g3 = tierScore;
            }
            totEvents = totEvents + tierScore
          } else {
            //console.log('false results - ' +resultSuccess + tierScore);
            totEvents = totEvents + tierScore
          }
        }
    }

totScore = g1 + (g2 * 3) + (g3 * 5);
  getPerson(bib,g1,g2,g3,totScore,totEvents);
}

  //end of d3.json
  callback(aggJSON);
  });
}

function getPerson (bibNo,g1,g2,g3,totScore,totEvents) {
  var persURL = "https://blooming-ridge-76065.herokuapp.com/participant/" + bibNo;
  $.getJSON( persURL, function( json ) {
    var isDavid = json.participant.isDavid;
    var teamName = json.participant.teamID;
    var bibNo = json.participant.bibNo
    console.log(isDavid)
    if (isDavid == true){
      var participantName = "<a href='/individual/?id=" +bibNo+"'>" + json.participant.lastName + ', ' + json.participant.firstName+"</a>*";
    } else {
      var participantName = "<a href='/individual/?id=" +bibNo+"'>" + json.participant.lastName + ', ' + json.participant.firstName+"</a>";
    }


    var resultArray = [];

    if (totEvents == 12){
      totEvents = "Course Complete"
    } else {
      totEvents = totEvents+'/12'
    }

    resultArray.push(participantName,bibNo,teamName,g1,g2,g3,totScore,totEvents);
    aggJSON.push(resultArray);

  })


  ;}

function createPage (aggJSON){
  $(document).ready (function() {
      $('#results').DataTable( {
          data: aggJSON,
          scrollY: "500px",
          scrollCollapse: true,
          order: [[ 6, "desc" ]],
          bStateSave: true,
          paging: false,
          processing: true,
          retrieve: true,
          deferRender: true,
          language: {
            emptyTable: "No results recorded"
          },
          columns: [
              { title: "Name" },
              { title: "Bib #" },
              { title: "Team" },
              { title: "G1" },
              { title: "G2" },
              { title: "G3" },
              { title: "Score" },
              { title: "Progress" }
          ]
      });
      document.getElementById("loadingGIF").style.visibility = "hidden";
    });

}

//12sec delay hardcoded to allow person results to load
getResults(function(){
  setTimeout(function(){
    createPage(aggJSON);
}, 12000);
});

//results reload every two minutes (180000ms)
var i = setInterval(function() { location.reload(); }, 180000);
