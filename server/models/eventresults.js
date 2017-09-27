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
  timestamp: {
    type: Date,
    required: true
  },
  resultID: {
    type: Number,
    required: true
  }
});

module.exports = {eventResults};
