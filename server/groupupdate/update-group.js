var participantID = getParameterByName('bibNo');
var dbID = []

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateScore(update){
  //console.log('update button works' + update.id)
  //console.log(update)
  var posturl = location.origin+"/groupupdate";
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
      $("#updateButton").click(function(){
        var genderValue = document.getElementById("genderdata").value
        var ageGroup = document.getElementById("agegroup").value

          if (document.getElementById("teamName") == null || document.getElementById("teamName").value.length === 0)
            {
              console.log('no team')
            }  else {
              var teamID = document.getElementById("teamName").value
            }


            if (teamID){
              var updatedSco = ({
                id: dbID[0],
                bibNo: `${participantID}`,
                teamID: `${teamID}`,
                gender: `${genderValue}`,
                group: `${ageGroup}`
              });
            } else {
              var updatedReg = ({
                id: dbID[0],
                bibNo: `${participantID}`,
                gender: `${genderValue}`,
                group: `${ageGroup}`
              });
            }

        updateScore(updatedSco)

      });

      var url = location.origin+"/scoring?bibNo=" + participantID;
      window.onunload = refreshParent;
      function refreshParent() {
          window.opener.location.reload();
      }

      $.ajax({
              url: url,
              type: 'GET',
              beforeSend: function(request) {
                request.setRequestHeader('k', '04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3');
              },
              dataType: 'json', // added data type
              success: function(data) {
                var participantName = data.participantScores[0].firstName + " " + data.participantScores[0].lastName;
                  var participantDiv = document.getElementById('participant-div');
                  participantDiv.innerHTML += participantName;
                  dbID.push(data.participantScores[0]._id);
                  document.getElementById('genderdata').value = data.participantScores[0].gender;
                  document.getElementById('agegroup').value = data.participantScores[0].group;
                  // if bibNo already assigned, prefill, otherwise, empty div
                  var bibDiv = document.getElementById('bib');
                  bibDiv.innerHTML +=  data.participantScores[0].bibNo;
                  if (data.participantScores[0].teamID){
                    document.getElementById('teamName').value = data.participantScores[0].teamID;
                  } else {
                    $( "#teamName" ).empty();
                  }
              }
          });

            $('#genderdata').keypress(function(e){
                  if(e.which == 13){//Enter key pressed
                      $('#updateButton').click();//Trigger search button click event
                  }
              });


                $('#agegroup').keypress(function(e){
                      if(e.which == 13){//Enter key pressed
                          $('#updateButton').click();//Trigger search button click event
                      }
                  });
                  $('#teamName').keypress(function(e){
                        if(e.which == 13){//Enter key pressed
                            $('#updateButton').click();//Trigger search button click event
                        }
                    });
});
