function mostRecent (){
	//Needs to be updated to pull in only recent finishers
	// should be updated more frequenty than all the rest
  var url = "/scoring?recent=true";
    $(document).ready (function() {
    $('#results-recent').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'participantScores'
        },
        scrollY: "500px",
        scrollCollapse: true,
        order: [[ 4, "desc" ]],
        bStateSave: true,
        paging: false,
        processing: true,
        retrieve: true,
        deferRender: true,
        language: {
          emptyTable: "No recent finishers"
        },
        columns: [
            { data: 'participant', title: 'Participant' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )}
        ],

    });
  });



}

function updateM (){
  var url = "/scoring?gender=M";
    $(document).ready (function() {
    $('#results-m').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'participantScores'
        },
        scrollY: "500px",
        scrollCollapse: true,
        order: [[ 4, "desc" ]],
        bStateSave: true,
        paging: false,
        processing: true,
        retrieve: true,
        deferRender: true,
        language: {
          emptyTable: "No results recorded"
        },
        columns: [
            { data: 'participant', title: 'Participant' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )},
            { data: 'progress', title: 'Progress' },
        ],

    });
  });



}

function updateAll (){
  var url = "/scoring";
    $(document).ready (function() {
    $('#results-all').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'participantScores'
        },
        scrollY: "500px",
        scrollCollapse: true,
        order: [[ 4, "desc" ]],
        bStateSave: true,
        paging: false,
        processing: true,
        retrieve: true,
        deferRender: true,
        language: {
          emptyTable: "No results recorded"
        },
        columns: [
            { data: 'participant', title: 'Participant' },
			{ data: 'bibNo', title: 'Bib#' },
			{ data: 'teamID', title: 'Team' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )},
            { data: 'progress', title: 'Progress' },
        ],

    });
  });



}

function updateF (){
  var url = "/scoring?gender=F";
    $(document).ready (function() {
    $('#results-f').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'participantScores'
        },
        scrollY: "500px",
        scrollCollapse: true,
        order: [[ 4, "desc" ]],
        bStateSave: true,
        paging: false,
        processing: true,
        retrieve: true,
        deferRender: true,
        language: {
          emptyTable: "No results recorded"
        },
        columns: [
            { data: 'participant', title: 'Participant' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )},
            { data: 'progress', title: 'Progress' },
        ],

    });
  });

}
function updateT (){
  var url = "/scoring?teamScores=true";
    $(document).ready (function() {
    $('#results-t').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'teamScores'
        },
        scrollY: "500px",
        scrollCollapse: true,
        order: [[ 4, "desc" ]],
        bStateSave: true,
        paging: false,
        processing: true,
        retrieve: true,
        deferRender: true,
        language: {
          emptyTable: "No results recorded"
        },
        columns: [
            { data: 'teamID', title: 'Team' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )},
            { data: 'onCourse', title: 'On Course', "defaultContent": "<i>n/a</i>" },
        ],

    });
  });

}



mostRecent();
updateM();
updateF();
updateT();
updateAll();

//results reload every three minutes (180000ms)
var i = setInterval(function() { location.reload(); }, 180000);
