const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  blood: { type: String, required: true },
  pincode: { type: String, required: true },
  phone: { type: String, required: true },
  urgency: { type: String, enum: ['Normal', 'Emergency'], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Request', requestSchema);
