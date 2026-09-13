const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const axios = require('axios');

const { rideMatchQueue } = require('../config/queue');

// Get real road distance and duration using OpenRouteService
const getRoadDistance = async (fromLng, fromLat, toLng, toLat) => {
  try {
    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car`,
      {
        params: {
          api_key: process.env.ORS_API_KEY,
          start: `${fromLng},${fromLat}`,
          end: `${toLng},${toLat}`
        }
      }
    );
    const summary = response.data.features[0].properties.summary;
    return {
      distanceKm: (summary.distance / 1000).toFixed(2),
      durationMins: Math.round(summary.duration / 60)
    };
  } catch (error) {
    // Fallback to Haversine if API fails
    return null;
  }
};

// Haversine as fallback
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Calculate fare
const calculateFare = (distanceKm) => {
  const baseFare = 50;
  const perKmRate = 12;
  return Math.round(baseFare + (distanceKm * perKmRate));
};

// REQUEST A RIDE

exports.requestRide = async (req, res) => {
  try {
    const { pickup, destination } = req.body;

    // Create the ride immediately in a 'finding_driver' state
    const ride = await Ride.create({
      riderId: req.user.id,
      pickup,
      destination,
      status: 'finding_driver'
    });

    // Push the actual matching work to the background queue
    await rideMatchQueue.add('matchDriver', {
      rideId: ride._id.toString(),
      pickup,
      destination,
      riderId: req.user.id
    });

    res.status(202).json({
      message: 'Finding driver...',
      rideId: ride._id
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// ACCEPT A RIDE
exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride no longer available' });
    }
    ride.status = 'accepted';
    await ride.save();

    const driver = await Driver.findByIdAndUpdate(
      ride.driverId,
      { isAvailable: false },
      { new: true }
    ).populate('userId', 'name');

    const io = req.app.get('io');
    if (io) {
      io.to(`ride:${ride._id}`).emit('ride:statusChanged', {
        rideId: ride._id,
        status: 'accepted',
        driverName: driver?.userId?.name || 'Your driver'
      });
    }

    res.status(200).json({ message: 'Ride accepted', ride });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// REJECT A RIDE
exports.rejectRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') {
      return res.status(400).json({ message: 'Ride no longer available' });
    }

    const rejectedDriverId = ride.driverId;

    // Re-queue this ride to find a different driver
    ride.status = 'finding_driver';
    ride.driverId = null;
    await ride.save();

    await rideMatchQueue.add('matchDriver', {
      rideId: ride._id.toString(),
      pickup: ride.pickup,
      destination: ride.destination,
      riderId: ride.riderId.toString(),
      excludeDriverId: rejectedDriverId?.toString()
    });

    res.status(200).json({ message: 'Ride rejected, finding another driver' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// UPDATE RIDE STATUS
exports.updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    ride.status = status;
    await ride.save();
    if (status === 'completed' || status === 'cancelled') {
      await Driver.findByIdAndUpdate(ride.driverId, { isAvailable: true });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`ride:${ride._id}`).emit('ride:statusChanged', {
        rideId: ride._id,
        status
      });
    }

    res.status(200).json({ message: 'Ride status updated', ride });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET MY RIDES
exports.getMyRides = async (req, res) => {
  try {
    const rides = await Ride.find({ riderId: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET SINGLE RIDE
exports.getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('riderId', 'name email')
      .populate('driverId');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    res.status(200).json(ride);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.getRoute = async (req, res) => {
  try {
    const { fromLat, fromLng, toLat, toLng } = req.query;

    const response = await axios.get(
      `https://api.openrouteservice.org/v2/directions/driving-car`,
      {
        params: {
          api_key: process.env.ORS_API_KEY,
          start: `${fromLng},${fromLat}`,
          end: `${toLng},${toLat}`
        }
      }
    );

    const coordinates = response.data.features[0].geometry.coordinates;
    // ORS returns [lng, lat] pairs, Leaflet wants [lat, lng] — flip them
    const routeCoords = coordinates.map(([lng, lat]) => [lat, lng]);

    res.status(200).json({ route: routeCoords });
  } catch (error) {
    res.status(500).json({ message: 'Could not fetch route', error: error.message });
  }
};