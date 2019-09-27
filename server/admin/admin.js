var aggJSON = [];
var aggIndvJSON = [];
var query
var datatable = $('#results').DataTable();

function getResults(query) {

  var url = location.origin+"/participant" + query;
  console.log(url)
  $('#results').DataTable( {

    ajax: {
        beforeSend: function(request) {
          request.setRequestHeader('k', '04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3');
        },
        url: url,
        dataSrc: 'participants'
      },
      scrollY: "500px",
      scrollCollapse: true,
      order: [[ 4, "desc" ]],
      paging: false,
      processing: true,
      retrieve: true,
      language: {
        emptyTable: "No participants found"
      },
      columnDefs: [ {
            targets: -1,
            defaultContent: "<button>Update</button>"
        } ],
      columns: [
          { data: 'firstName', title: 'First' },
          { data: 'lastName', title: 'Last' },
          { data: 'birthdate', title: 'Birthday' },
          { data: 'gender', title: 'Gender'},
          { data: 'heat', title: 'Heat Time' },
          { data: 'bibNo', title: 'Bib #', defaultContent: ""},
          { title: 'Update' },
      ],

  });
  //var table = $('#results').DataTable();
  $('#results tbody').on( 'click', 'button', function () {
    var table = $('#results').DataTable();
    var data = table.row( $(this).parents('tr') ).data();
    //console.log(data._id)
    //update pre-populated form
    window.open(location.origin+"/update-reg?id=" + data._id,'popUpWindow','height=500,width=500,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=yes,menubar=no,location=no,directories=no, status=yes');


  } );

  $('#refreshButton').show();
}

$(document).ready(function() {

//add enter key event handler for last name search
  $("#lastNameSearchButton").click(function(){
    var lastName = document.getElementById("lastname-data").value.trim()
    query='?lastName='+lastName
    //table clearing is not working
    //$('#results').dataTable().fnClearTable();
    $("#datatable").html("");
    var newDiv = document.createElement("table")
      newDiv.setAttribute("id", "results","class","display", "width","100%");
      newDiv.setAttribute("class","display");
      newDiv.setAttribute("width","100%");

      document.getElementById("datatable").appendChild(newDiv);

    getResults(query)
  });

  //add enter key event handler for date search

  $("#birthdaySearchButton").click(function(){
    var dateValue = document.getElementById("date-data").value
    var d = new Date(dateValue+"T00:00:00");
    var bday = d.toLocaleDateString("en-US")
    query='?bday='+bday
    $("#datatable").html("");
    var newDiv = document.createElement("table")
      newDiv.setAttribute("id", "results","class","display", "width","100%");
      newDiv.setAttribute("class","display");
      newDiv.setAttribute("width","100%");

      document.getElementById("datatable").appendChild(newDiv);
    // do something
    getResults(query)
  });

  $('#lastname-data').keypress(function(e){
        if(e.which == 13){//Enter key pressed
            $('#lastNameSearchButton').click();//Trigger search button click event
        }
    });

    $('#date-data').keypress(function(e){
          if(e.which == 13){//Enter key pressed
              $('#birthdaySearchButton').click();//Trigger search button click event
          }
      });

      $("#refreshButton").click(function(){
        $("#datatable").html("");
        var newDiv = document.createElement("table")
          newDiv.setAttribute("id", "results","class","display", "width","100%");
          newDiv.setAttribute("class","display");
          newDiv.setAttribute("width","100%");
          document.getElementById("datatable").appendChild(newDiv);
        // do something
        getResults(query)
      });

     if (query) {
                 $('#refreshButton').show();
               } else {
                 $('#refreshButton').hide();
               }


});
