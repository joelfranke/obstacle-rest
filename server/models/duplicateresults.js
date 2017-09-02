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
    type: String,
    required: true,
    default: null
  },
  success: {
    type: Boolean,
    required: true,
    default: false
  }
});

module.exports = {dupeResults};
