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
  birthdate: {
    type: String,
    required: true,
    default: null
  },
  address1: {
    type: String,
    default: null
  },
  address2: {
    type: String,
    default: null
  },
  city: {
    type: String,
    default: null
  },
  state: {
    type: String,
    default: null
  },
  zip: {
    type: String,
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
  phone: {
    type: String,
    default: null
  },
  gender: {
    type: String,
    default: null
  },
  startTime: {
    type: String,
    default: null
  },
  finishTime: {
    type: String,
    default: null
  },
  ropeClimb: {
      type: String,
      default: null
    }
});

module.exports = {Participant};
