var mongoose = require('mongoose');

var Participant = mongoose.model('Participant', {
  bibNo: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  isDavid: {
    type: Boolean,
    required: true
  },
  lastName: {
    type: String,
    required: true,
    default: null
  },
  firstName: {
    type: String,
    required: true,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  heat: {
    type: String,
    required: false,
    default: null
  },
  age: {
    type: Number,
    default: null
  },
  ageGroup: {
    type: String,
    default: null
  },
  teamID: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    default: null
  }
});

module.exports = {Participant};
