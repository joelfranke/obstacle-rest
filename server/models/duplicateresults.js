var mongoose = require('mongoose');

var dupeResults = mongoose.model('duplicateresults', {
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
  timestamp: {
      type: Date,
      required: true
    },
    deviceTime: {
      type: String
    },
  success: {
    type: Boolean,
    required: true,
    default: false
  },
  countScore: {
    type: Boolean,
    required: true,
    default: true
  }
});

module.exports = {dupeResults};
