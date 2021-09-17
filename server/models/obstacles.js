var mongoose = require('mongoose');

var obstacles = mongoose.model('obstacles', {
  sequence: {
    type: Number,
    required: false,
    trim: true
  },
  name: {
    type: String,
    required: true
  },
  version: {
    type: String
  },
  attemptsAllowed: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  description: {
    type: String
  },
  rules: {
    type: String
  },
  scored:{
    type: Boolean,
    required: true,
    default: true
  },
  sponsor: {
    type: String
  },
  coordinate: {
    type: Array,
    required: true,
    default: null
  },
  scoring: {
    type: Array
    }


});

module.exports = {obstacles};
