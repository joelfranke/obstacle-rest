var mongoose = require('mongoose');

var counters = mongoose.model('counters', {
  _id: {
    type: String
  },
  seq: {
    type: Number
  }
});

module.exports = {counters};
