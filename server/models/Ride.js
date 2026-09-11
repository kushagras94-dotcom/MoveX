const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  pickup: { lat: Number, lng: Number, address: String },
  destination: { lat: Number, lng: Number, address: String },
  status: { 
    type: String, 
    enum: ['finding_driver','requested', 'accepted', 'ongoing', 'completed', 'cancelled'],
    default: 'finding_driver'
  },
  fare: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', rideSchema);
