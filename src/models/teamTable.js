var mongoose = require('mongoose');

var team = mongoose.model('teamTable', {
  teamID: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  teamName: {
    type: String,
    required: true,
    default: null
  },
  teamSize: {
    type: Number,
    default: null
  }
});

module.exports = {team};
