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
    type: String,
    required: true,
    default: null
  },
  success: {
    type: Boolean,
    required: true,
    default: false
  },
  resultID: {
    type: Number,
    required: true
  }
});

module.exports = {eventResults};
