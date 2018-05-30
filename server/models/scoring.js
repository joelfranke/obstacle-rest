var mongoose = require('mongoose');

var Scoring = mongoose.model('score', {
  bibNo: {
    type: Number,
    required: true,
    minlength: 1,
    trim: true
  },
  participant: {
    type: String,
    required: true,
    default: null
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  gender: {
    type: String
  },
  group: {
    type: String,
    default: null
  },
  teamID: {
    type: String,
    required: false,
    default: null
  },
  isDavid: {
	 type: Boolean,
	 default: true
  },
  g1: {
    type: Number,
    required: true
  },
  g2: {
    type: Number,
    required: true
  },
  g3: {
    type: Number,
    required: true
  },
    g3: {
    type: Number,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
    updatedOn: {
    type: Date,
    required: true
  },
    progress: {
    type: String,
	required: true
},
obstaclesCompleted: {
type: Number,
required: true
},
tiebreaker: {
  type: Number,
  required: false,
  default: 999.99
},
next: {
type: Number,
required: true
}
});

module.exports = {Scoring};
