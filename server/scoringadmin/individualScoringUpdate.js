var aggJSON = [];
var aggIndvJSON = [];
var dbID


function getResults(participantID,callback) {

  //test
                    var url2 = location.origin+"/participant?bibNo=" + participantID;
                    console.log(url2)
                    $.ajax({
                            url: url2,
                            type: 'GET',
                            beforeSend: function(request) {
                              request.setRequestHeader('k', '04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3');
                            },
                            dataType: 'json', // added data type
                            success: function(data) {

dbID = data.participants[0]._id

                            }
                        });


  //end test
aggIndvJSON = [];
  var jsonData = location.origin+"/results/" + participantID;
   var personData = location.origin+"/scoring/?bibNo=" + participantID;

   			var obstIndex = [];
   			var obstacleData = "/obstacle-details";

   			$.getJSON( obstacleData, function( obstacleJson ) {
   				var obstacles = obstacleJson.obstacle
   				for (var i = 0; i < obstacles.length; i++) {
   						if (obstacles[i].scored == true){
   						console.log(obstacles[i].name)
   						var newObstacle = new Object();
   							newObstacle.obstID = obstacles[i].sequence;
   							newObstacle.value = obstacles[i].name;
   						obstIndex.push(newObstacle);
   					}
   				}
   		  });

  $.getJSON( personData, function( personJson ) {


    var personData = personJson.participantScores[0];
    var teamID = personData.teamID;
	var gender
    if (teamID !== null && teamID !== ""){
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b> ("+personData.teamID+")";
    } else {
      var participantName = "<b>"+personData.lastName + ', ' + personData.firstName+"</b>"
    }
    var urlPop= location.origin+'/update-group?bibNo='+participantID
      var participantDiv = document.getElementById('participant-div');
      participantDiv.innerHTML += participantName;

      //testing
      var participantPointsDiv = document.getElementById('participant-score-text');
    //  participantDiv.innerHTML +='<a href="'+urlPop+'" target="popup" onclick="window.open(\''+urlPop+'\',\'popup\',\'width=600,height=600\'); return false;"><img id="edit" src="https://img.icons8.com/material-sharp/16/000000/edit.png"></a>'
      participantPointsDiv.innerHTML +='<a href="'+urlPop+'" target="popup" onclick="window.open(\''+urlPop+'\',\'popup\',\'width=600,height=600\'); return false;"><img id="edit" src="https://img.icons8.com/material-sharp/16/000000/edit.png"></a>'

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
      var countScore = json.participantResults[item].countScore;
      //update to include individual score
      if (success == true){
        success = 	"&#x2714;"
      } else {
        success = "&#x2715;"
      }

      if (countScore == true){
        countScore = 	"&#x2714;"
      } else {
        countScore = "&#x2715;"
      }
      var indivResultArray = [];
      indivResultArray.push(obstName,tier,success,countScore,deviceTime,_id);
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
          searching: false,
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
              { title: "Count Score?" },
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
              window.open(location.origin+"/update-score?id=" + data[5],'popUpWindow','height=500,width=500,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes');

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

    $("#participant-div").html("");

    $("#participant-points-div").html("");
    $("#participant-score-text").html("");
    var pointTextDiv = document.getElementById('participant-score-text');
     pointTextDiv.innerHTML += 'Points<br><br>'

    $("#participant-ranks-div").html("");
    //refresh table
     $("#datatable").html("");
     var newDiv = document.createElement("table")
       newDiv.setAttribute("id", "results","class","display", "width","100%");
       newDiv.setAttribute("class","display");
       newDiv.setAttribute("width","100%");
       document.getElementById("datatable").appendChild(newDiv);

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
      //Refresh name and scores
      $("#participant-div").html("");

      $("#participant-points-div").html("");
      $("#participant-ranks-div").html("");
      //refresh table
       $("#datatable").html("");
       var newDiv = document.createElement("table")
         newDiv.setAttribute("id", "results","class","display", "width","100%");
         newDiv.setAttribute("class","display");
         newDiv.setAttribute("width","100%");
         document.getElementById("datatable").appendChild(newDiv);
      // do something
      $('#bibNoSearchButton').click();
    });

    $('#participant-score-div').hide();
    $('#refreshButton').hide();
    $('#edit').hide();

})
