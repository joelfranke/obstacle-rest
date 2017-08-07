var mongoose = require('mongoose');

var obstacle = mongoose.model('obstacle', {
  obstID: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  obstName: {
    type: String,
    required: true,
    default: null
  },
  geoLocation: {
    type: String,
    default: null
  }
});

module.exports = {obstacle};
