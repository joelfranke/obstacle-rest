var mongoose = require('mongoose');

var eventResults = mongoose.model('results', {
  bibNo: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  obstID: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  tier: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  lapCount: {
    type: Number,
    required: true,
    default: 1
  },
  success: {
    type: Boolean,
    required: true,
    default: false
  },
  bibFromBand: {
    type: Boolean,
    required: false,
    default: true
  },
  g8: {
    type: Boolean,
    required: true,
    default: false
  },
  timestamp: {
    type: Date,
    required: true
  },
  deviceTime: {
    type: String
  },
  resultID: {
    type: Number,
    required: true
  },
  points:{
    type: Number,
    required: true,
    default: 0
  },
  countScore: {
    type: Boolean,
    required: true,
    default: true
  }
});

module.exports = {eventResults};
