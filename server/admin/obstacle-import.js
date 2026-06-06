var currentObstacles = [];
var uploadedObstacles = [];
var previewData = [];
var previewTable = null;

var AUTH_TOKEN = '04AA27B75640D189EEF52BCC78BA34CEBEA9440E563D7F2B36B5CB98EC899CC3';

function showStatus(message, type) {
  $('#status').text(message).removeClass('success error info').addClass(type).show();
}

function formatCoordinate(coord) {
  if (!coord || !Array.isArray(coord) || coord.length < 2) {
    return '(none)';
  }
  return coord[0] + ', ' + coord[1];
}

function coordinatesEqual(a, b) {
  if (!a && !b) return true;
  if (!a || !b || a.length < 2 || b.length < 2) return false;
  return Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1]);
}

function getExistingDescription(existing) {
  if (existing.description !== undefined && existing.description !== null) {
    return existing.description;
  }
  if (existing.obstacleDescription !== undefined && existing.obstacleDescription !== null) {
    return existing.obstacleDescription;
  }
  return '';
}

function getExistingRecordable(existing) {
  if (existing.scored !== undefined) {
    return Boolean(existing.scored);
  }
  if (existing.recordable !== undefined) {
    return Boolean(existing.recordable);
  }
  return true;
}

function getChangedFields(existing, update) {
  var changed = [];

  if (update.sequence !== undefined && Number(existing.sequence) !== Number(update.sequence)) {
    changed.push('sequence');
  }
  if (update.coordinate !== undefined && !coordinatesEqual(existing.coordinate, update.coordinate)) {
    changed.push('coordinate');
  }
  if (update.rules !== undefined && (existing.rules || '') !== update.rules) {
    changed.push('rules');
  }
  if (update.description !== undefined && getExistingDescription(existing) !== update.description) {
    changed.push('obstacleDescription');
  }
  if (update.scored !== undefined && getExistingRecordable(existing) !== Boolean(update.scored)) {
    changed.push('recordable');
  }

  return changed;
}

function formatRecordable(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  return value ? 'true' : 'false';
}

function mapJsonToDbFields(jsonObstacle) {
  var update = {};

  if (jsonObstacle.sequence !== undefined && jsonObstacle.sequence !== null) {
    update.sequence = Number(jsonObstacle.sequence);
  }
  if (jsonObstacle.coordinate !== undefined) {
    update.coordinate = jsonObstacle.coordinate;
  }
  if (jsonObstacle.version !== undefined) {
    update.version = jsonObstacle.version;
  }
  if (jsonObstacle.attemptsAllowed !== undefined) {
    update.attemptsAllowed = jsonObstacle.attemptsAllowed;
  }
  if (jsonObstacle.rules !== undefined) {
    update.rules = jsonObstacle.rules;
  }
  if (jsonObstacle.sponsor !== undefined) {
    update.sponsor = jsonObstacle.sponsor;
  }
  if (jsonObstacle.obstacleDescription !== undefined) {
    update.description = jsonObstacle.obstacleDescription;
  } else if (jsonObstacle.description !== undefined) {
    update.description = jsonObstacle.description;
  }
  if (jsonObstacle.recordable !== undefined) {
    update.scored = jsonObstacle.recordable;
  } else if (jsonObstacle.scored !== undefined) {
    update.scored = jsonObstacle.scored;
  }

  return update;
}

function buildPreview() {
  var byName = {};
  for (var i = 0; i < currentObstacles.length; i++) {
    byName[currentObstacles[i].name] = currentObstacles[i];
  }

  previewData = [];
  var toUpdate = 0;
  var toAdd = 0;
  var unchanged = 0;

  for (var j = 0; j < uploadedObstacles.length; j++) {
    var incoming = uploadedObstacles[j];
    if (!incoming || !incoming.name) {
      continue;
    }

    var existing = byName[incoming.name];
    var update = mapJsonToDbFields(incoming);
    var row = {
      name: incoming.name,
      currentSequence: existing ? (existing.sequence != null ? existing.sequence : '') : '',
      newSequence: update.sequence != null ? update.sequence : '',
      currentCoordinate: existing ? formatCoordinate(existing.coordinate) : '',
      newCoordinate: formatCoordinate(update.coordinate),
      currentRecordable: existing ? formatRecordable(getExistingRecordable(existing)) : '',
      newRecordable: update.scored !== undefined ? formatRecordable(update.scored) : '',
      changes: '',
      status: 'unchanged'
    };

    if (!existing) {
      row.status = 'new';
      toAdd++;
    } else {
      var changedFields = getChangedFields(existing, update);
      row.changes = changedFields.join(', ');
      if (changedFields.length > 0) {
        row.status = 'changed';
        toUpdate++;
      } else {
        unchanged++;
      }
    }

    previewData.push(row);
  }

  return { toUpdate: toUpdate, toAdd: toAdd, unchanged: unchanged };
}

function renderPreviewTable() {
  if (previewTable) {
    previewTable.destroy();
    $('#preview-table').empty();
  }

  previewTable = $('#preview-table').DataTable({
    data: previewData,
    paging: false,
    scrollY: '500px',
    scrollCollapse: true,
    order: [[1, 'asc']],
    columns: [
      { data: 'name', title: 'Name' },
      { data: 'currentSequence', title: 'Current Order' },
      { data: 'newSequence', title: 'New Order' },
      { data: 'currentCoordinate', title: 'Current Coordinate' },
      { data: 'newCoordinate', title: 'New Coordinate' },
      { data: 'currentRecordable', title: 'Current Recordable' },
      { data: 'newRecordable', title: 'New Recordable' },
      { data: 'changes', title: 'Changed Fields', defaultContent: '' },
      {
        data: 'status',
        title: 'Status',
        render: function(data) {
          if (data === 'changed') return 'Will update';
          if (data === 'new') return 'Will add';
          return 'No changes';
        }
      }
    ],
    rowCallback: function(row, data) {
      if (data.status === 'changed') {
        $(row).addClass('changed');
      } else if (data.status === 'new') {
        $(row).addClass('new');
      } else {
        $(row).addClass('unchanged');
      }
    }
  });
}

function loadCurrentObstacles(callback) {
  $.getJSON(location.origin + '/obstacle-details', function(data) {
    currentObstacles = data.obstacle || [];
    callback();
  }).fail(function() {
    showStatus('Failed to load current obstacles from the database.', 'error');
  });
}

$(document).ready(function() {
  $('#json-file').on('change', function(e) {
    var file = e.target.files[0];
    uploadedObstacles = [];
    previewData = [];
    $('#applyButton').prop('disabled', true);
    $('#previewButton').prop('disabled', true);
    $('#summary').hide();
    if (previewTable) {
      previewTable.clear().draw();
    }

    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function(event) {
      try {
        var parsed = JSON.parse(event.target.result);
        uploadedObstacles = Array.isArray(parsed.obstacle) ? parsed.obstacle : [];
        if (uploadedObstacles.length === 0) {
          showStatus('JSON file does not contain an obstacle array.', 'error');
          return;
        }
        $('#previewButton').prop('disabled', false);
        showStatus('Loaded ' + uploadedObstacles.length + ' obstacles from file. Click Preview Changes.', 'info');
      } catch (err) {
        showStatus('Invalid JSON file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  $('#previewButton').click(function() {
    loadCurrentObstacles(function() {
      var summary = buildPreview();
      renderPreviewTable();
      $('#summary').html(
        '<strong>Preview:</strong> ' + summary.toUpdate + ' to update, ' +
        summary.toAdd + ' to add, ' +
        summary.unchanged + ' unchanged.'
      ).show();
      $('#applyButton').prop('disabled', summary.toUpdate === 0 && summary.toAdd === 0);
      showStatus('Preview ready. Review the table below before applying.', 'info');
    });
  });

  $('#applyButton').click(function() {
    if (!uploadedObstacles.length) {
      return;
    }

    if (!window.confirm('Apply obstacle updates and additions to the database?')) {
      return;
    }

    $('#applyButton').prop('disabled', true);

    $.ajax({
      url: location.origin + '/obstacle-import',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ obstacle: uploadedObstacles }),
      beforeSend: function(request) {
        request.setRequestHeader('k', AUTH_TOKEN);
      },
      success: function(response) {
        var updated = 0;
        var added = 0;
        var unchanged = 0;
        for (var i = 0; i < response.results.length; i++) {
          if (response.results[i].status === 'updated') updated++;
          else if (response.results[i].status === 'added') added++;
          else unchanged++;
        }
        showStatus(
          'Import complete: ' + updated + ' updated, ' + added + ' added, ' + unchanged + ' unchanged.',
          'success'
        );
        loadCurrentObstacles(function() {
          var summary = buildPreview();
          renderPreviewTable();
          $('#summary').html(
            '<strong>After import:</strong> ' + summary.toUpdate + ' pending updates, ' +
            summary.toAdd + ' to add, ' +
            summary.unchanged + ' unchanged.'
          ).show();
        });
      },
      error: function(xhr) {
        var message = xhr.responseJSON && xhr.responseJSON.message
          ? xhr.responseJSON.message
          : 'Failed to apply obstacle updates.';
        showStatus(message, 'error');
        $('#applyButton').prop('disabled', false);
      }
    });
  });
});
