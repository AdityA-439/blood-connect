const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  blood: { type: String, required: true },
  pincode: { type: String, required: true },
  phone: { type: String, required: true },
  available: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  lastDonatedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Donor', donorSchema);
