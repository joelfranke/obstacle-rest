var participantID = getParameterByName('id');

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function updateRegistration(update){
  //console.log('update button works' + update.id)
  //console.log(update)
  var posturl = location.origin+"/registrationupdate";
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
        var birthdayValue = document.getElementById("birthdaydata").value
        var ageGroup = document.getElementById("agegroup").value
        if (document.getElementById("bibNo") == null || document.getElementById("bibNo").value.length === 0)
          {
            console.log('empty bib no')
          }  else {
            var bibNo = document.getElementById("bibNo").value
          }

          if (document.getElementById("teamName") == null || document.getElementById("teamName").value.length === 0)
            {
              console.log('no team')
            }  else {
              var teamID = document.getElementById("teamName").value
            }
          if (bibNo){
            if (teamID){
              var updatedReg = ({
                id: `${participantID}`,
                bibNo: `${bibNo}`,
                teamID: `${teamID}`,
                gender: `${genderValue}`,
        				birthday: `${birthdayValue}`,
                group: `${ageGroup}`
              });
            } else {
              var updatedReg = ({
                id: `${participantID}`,
                bibNo: `${bibNo}`,
                gender: `${genderValue}`,
        				birthday: `${birthdayValue}`,
                group: `${ageGroup}`
              });
            }

          } else {

            if (teamID){
              var updatedReg = ({
                id: `${participantID}`,
                teamID: `${teamID}`,
                gender: `${genderValue}`,
                birthday: `${birthdayValue}`,
                group: `${ageGroup}`
              });
            } else {
              var updatedReg = ({
                id: `${participantID}`,
                gender: `${genderValue}`,
                birthday: `${birthdayValue}`,
                group: `${ageGroup}`
              });
            }
          }

        updateRegistration(updatedReg)

      });

      var url = location.origin+"/participant?id=" + participantID;
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
                var participantName = data.participants[0].firstName + " " + data.participants[0].lastName;
                  var participantDiv = document.getElementById('participant-div');
                  participantDiv.innerHTML += participantName;
                  document.getElementById('birthdaydata').value = data.participants[0].birthdate;
                  document.getElementById('genderdata').value = data.participants[0].gender;
                  document.getElementById('agegroup').value = data.participants[0].group;
                  // if bibNo already assigned, prefill, otherwise, empty div
                  if (data.participants[0].bibNo){
                    document.getElementById('bibNo').value = data.participants[0].bibNo;
                  } else {
                    $( "#bib" ).empty();
                  }
                  if (data.participants[0].teamID){
                    document.getElementById('teamName').value = data.participants[0].teamID;
                  } else {
                    $( "#teamName" ).empty();
                  }
              }
          });

          $('#bibNo').keypress(function(e){
                if(e.which == 13){//Enter key pressed
                    $('#updateButton').click();//Trigger search button click event
                }
            });

            $('#genderdata').keypress(function(e){
                  if(e.which == 13){//Enter key pressed
                      $('#updateButton').click();//Trigger search button click event
                  }
              });

              $('#birthdaydata').keypress(function(e){
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
