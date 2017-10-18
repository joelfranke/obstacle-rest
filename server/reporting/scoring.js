
function createPage (){
  var url = "/scoring";
    $(document).ready (function() {
    $('#results').DataTable( {
      ajax: {
          url: url,
          dataSrc: ''
        },
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
            { data: 'person', title: 'Name' },
            { data: 'bibNo', title: 'Bib #' },
            { data: 'teamID', title: 'Team' },
            { data: 'g1', title: 'G1' },
            { data: 'g2', title: 'G2' },
            { data: 'g3', title: 'G3'},
            { data: 'score', title: 'Score',  render: $.fn.dataTable.render.number( ',', '.', 0 )},
            { data: 'progress', title: 'Progress' },
        ]
    });
  });



}

createPage();

//results reload every three minutes (180000ms)
var i = setInterval(function() { location.reload(); }, 180000);
