var resultID = getParameterByName('id');
var bib = []

var obstIndex = [{obstID: 1, value: "Water Carry"},
    {obstID: 2, value: "Ninja Killer"},
    {obstID: 3, value: "Hangman"},
    {obstID: 4, value: "Arachnophobia"},
    {obstID: 5, value: "Balancing Act"},
    {obstID: 6, value: "Leap of Faith"},
    {obstID: 7, value: "Slippery Wall Monkey"},
    {obstID: 8, value: "Circus Maximus"},
    {obstID: 9, value: "Skyclimb"},
    {obstID: 10, value: "The Destroyer"},
    {obstID: 11, value: "Rope Cross"},
    {obstID: 12, value: "Over the Moon"}
];

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
              //console.log(updatedRes)
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
