var resultID = getParameterByName('id');
var bib = []


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateResult(update){
  console.log('update button works' + update.id)
//  console.log(update)
  var posturl = location.origin+"/scoringupdate";
  //console.log(posturl)
  $.ajax({
          url: posturl,
          type: 'POST',
          beforeSend: function(request) {
            request.setRequestHeader('k', '04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3');
          },
          contentType: "application/json",
          data: JSON.stringify(update),
          success: function(response) {
            console.log(response)
            var popup = window.self;
            popup.opener = window.self;
            popup.close();
          }
      });

}



$(document).ready(function() {
  //start testing new obstacle array
var obstIndex = [];
var jsonData = "/obstacle-details";

$.getJSON( jsonData, function( obstacleJson ) {
  var obstacles = obstacleJson.obstacle
  for (var i = 0; i < obstacles.length; i++) {
      if (obstacles[i].scored == true){
      var newObstacle = new Object();
        newObstacle.obstID = obstacles[i].sequence;
        newObstacle.value = obstacles[i].name;
      obstIndex.push(newObstacle);
    }
  }

});
//end testing
      $("#updateButton").click(function(){
        //var obstID = document.getElementById("obstID").value
        var tier = document.getElementById("tier").value
        var obst = document.getElementById("obstID").value
      obst = Number(obst)
        var success = document.getElementById("success").value
        if (success == 'true'){
          success=true
        } else {
          success=false
        }
        var countScore = document.getElementById("countScore").value
        if (countScore == 'true'){
          countScore=true
        } else {
          countScore=false
        }
      //  console.log(bib)
              var updatedRes = ({
                id: `${resultID}`,
                obstID: obst,
                bibNo: `${bib[0]}`,
                tier: tier,
                success: success,
                countScore: countScore
              });
              updateResult(updatedRes)
            })



      var url = location.origin+"/results?id=" + resultID;
      window.onunload = refreshParent;
      function refreshParent() {
          window.opener.location.reload();
      }

      $.ajax({
              url: url,
              type: 'GET',
              dataType: 'json', // added data type
              success: function(data) {
                var participantName = data.participantResults[0].bibNo
                var participantDiv = document.getElementById('participant-div');
                participantDiv.innerHTML += participantName;
                bib.push(participantName);
                var obstName;
                console.log(obstIndex)
                Object.keys(obstIndex).forEach(function (key)
                  {
                    if(obstIndex[key].obstID == data.participantResults[0].obstID){
                      obstName = obstIndex[key].value;
                      //need to pass obstName to the obstName callback
                    }
                  });
                obstName = data.participantResults[0].obstID + ". "+ obstName
                var obstDiv = document.getElementById('obst');
                obstDiv.innerHTML += obstName;
                  //document.getElementById('obstID').value = obstName
                  document.getElementById('obstID').value = data.participantResults[0].obstID;
                  document.getElementById('tier').value = data.participantResults[0].tier;
                  document.getElementById('success').value = data.participantResults[0].success;
                  document.getElementById('countScore').value = data.participantResults[0].countScore;


              }
          });

          $('#obstID').keypress(function(e){
                if(e.which == 13){//Enter key pressed
                    $('#updateButton').click();//Trigger search button click event
                }
            });

            $('#tier').keypress(function(e){
                  if(e.which == 13){//Enter key pressed
                      $('#updateButton').click();//Trigger search button click event
                  }
              });

              $('#success').keypress(function(e){
                    if(e.which == 13){//Enter key pressed
                        $('#updateButton').click();//Trigger search button click event
                    }
                });

                $('#countScore').keypress(function(e){
                      if(e.which == 13){//Enter key pressed
                          $('#updateButton').click();//Trigger search button click event
                      }
                  });
});
