var mongoose = require('mongoose');

var teamScoring = mongoose.model('teamscore', {
  teamID: {
    type: String,
    required: false,
    default: null
  },
  g1: {
    type: Number,
    required: true
  },
  g2: {
    type: Number,
    required: true
  },
  g3: {
    type: Number,
    required: true
  },
    g3: {
    type: Number,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  onCourse: {
    type: Number,
    required: false
  },
    updatedOn: {
    type: Date,
    required: true
  }
});

module.exports = {teamScoring};
