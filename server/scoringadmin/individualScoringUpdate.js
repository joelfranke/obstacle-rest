var aggJSON = [];
var aggIndvJSON = [];

var obstIndex = [{obstID: 1, value: "Water Carry"},
    {obstID: 2, value: "Arachnophobia"},
    {obstID: 3, value: "Slippery Wall Monkey"},
    {obstID: 4, value: "Skyclimb"},
    {obstID: 5, value: "Circus Maximus"},
    {obstID: 6, value: "The Destroyer"},
    {obstID: 7, value: "Leap of Faith"},
    {obstID: 8, value: "Balancing Act"},
    {obstID: 9, value: "Rope Cross"},
    {obstID: 10, value: "Hangman"},
    {obstID: 11, value: "Ninja Killer"},
    {obstID: 12, value: "Over the Moon"}
];


function getResults(participantID,callback) {
  var jsonData = location.origin+"/results/" + participantID;
   var personData = location.origin+"/scoring/?bibNo=" + participantID;

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

	  var pointsDiv = document.getElementById('participant-points-div');
      pointsDiv.innerHTML += score +'<br>' ;
	   var ranksDiv = document.getElementById('participant-ranks-div');
      ranksDiv.innerHTML += rank +'<br>' + sexRank+'<br>'+groupRank+'<br>' +'<br>';
  });

  $.getJSON( jsonData, function( json ) {

    for (var item in json.participantResults) {
      var _id=json.participantResults[item]._id;

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
      indivResultArray.push(obstName,tier,success,deviceTime,_id);
      aggIndvJSON.push(indivResultArray);
    }
  })
  callback(aggIndvJSON);
}


function createPage (aggIndvJSON,participant){

  $(document).ready (function() {
      $('#results').DataTable( {
        //  ajax: aggIndvJSON,
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
            emptyTable: "No results found"
          },
          columnDefs: [ {
                targets: -1,
                defaultContent: "<button>Update</button>"
            } ],
          columns: [
              { title: "Obstacle" },
              { title: "Tier" },
              { title: "Result" },
              { title: "Time completed" },
              { title: "Result ID" },
              { title: 'Update' },
          ]
      });
      //add event handler for update button to open new page

      $("#results > tbody").on( "click", "tr", function () {
        var table = $('#results').DataTable();
              var data = table.row($(this)).data();
              console.log(data);
              window.open(location.origin+"/update-score?id=" + data[4],'popUpWindow','height=500,width=500,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes');

       } );
      // $("#results tbody").click(function(){
      //
      //   var table = $('#results').DataTable();
      //   var data = table.row( $(this).parents('tr') ).data();
      //   console.log(data)
      //   //update pre-populated form in popup window
      //
      // });
      $('#participant-score-div').show();
      $('#refreshButton').show();
    });

}


$(document).ready(function() {

//add enter key event handler for last name search
  $("#bibNoSearchButton").click(function(){
    var participantID = document.getElementById("bibNo-data").value.trim()

    getResults(participantID,function(){
      setTimeout(function(){
        createPage(aggIndvJSON);
    }, 2500);

    });
  });

  $('#bibNo-data').keypress(function(e){
        if(e.which == 13){//Enter key pressed
            $('#bibNoSearchButton').click();//Trigger search button click event
        }
    });

    $("#refreshButton").click(function(){
      // $("#datatable").html("");
      // var newDiv = document.createElement("table")
      //   newDiv.setAttribute("id", "results","class","display", "width","100%");
      //   newDiv.setAttribute("class","display");
      //   newDiv.setAttribute("width","100%");
      //   document.getElementById("datatable").appendChild(newDiv);
      // do something
      $('#bibNoSearchButton').click();
    });

    $('#participant-score-div').hide();
    $('#refreshButton').hide();

})
