const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  method: {
    type: String,
    required: true
  },
  route: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    default: ''
  },
  browser: {
    type: String,
    default: ''
  },
  os: {
    type: String,
    default: ''
  },
  device: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  referrer: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Activity', activitySchema);
