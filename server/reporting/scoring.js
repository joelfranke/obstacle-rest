function mostRecent (){
  var url = "/scoring";
    $(document).ready (function() {
    $('#results').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'results'
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

function updateM (){
  var url = "/scoring?gender=M";
    $(document).ready (function() {
    $('#results-m').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'results'
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

function updateF (){
  var url = "/scoring?gender=F";
    $(document).ready (function() {
    $('#results-f').DataTable( {
      ajax: {
          url: url,
          dataSrc: 'results'
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

mostRecent();
updateM();
updateF();

//results reload every three minutes (180000ms)
var i = setInterval(function() { location.reload(); }, 180000);
