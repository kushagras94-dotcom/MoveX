const { Worker } = require('bullmq');
const { connection } = require('../config/queue');
const axios = require('axios');
const Ride = require('../models/Ride');
const Driver = require('../models/Driver');

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
    return null;
  }
};

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

const calculateFare = (distanceKm) => {
  const baseFare = 50;
  const perKmRate = 12;
  return Math.round(baseFare + (distanceKm * perKmRate));
};

// This function needs access to the io instance to emit socket events.
// We export a function that accepts io, and index.js will call it to start the worker.
function startRideMatchWorker(io) {
  const worker = new Worker('rideMatch', async (job) => {
    const { rideId, pickup, destination, riderId } = job.data;

    const availableDrivers = await Driver.find({ isAvailable: true });

    if (availableDrivers.length === 0) {
      io.to(`ride:${rideId}`).emit('ride:matchFailed', {
        message: 'No drivers available'
      });
      await Ride.findByIdAndDelete(rideId);
      return;
    }

    let nearestDriver = null;
    let shortestDuration = Infinity;
    let nearestDriverInfo = null;

    for (const driver of availableDrivers) {
      const roadData = await getRoadDistance(
        pickup.lng, pickup.lat,
        driver.location.lng, driver.location.lat
      );

      if (roadData) {
        if (roadData.durationMins < shortestDuration) {
          shortestDuration = roadData.durationMins;
          nearestDriver = driver;
          nearestDriverInfo = roadData;
        }
      } else {
        const dist = haversineDistance(
          pickup.lat, pickup.lng,
          driver.location.lat, driver.location.lng
        );
        if (dist < shortestDuration) {
          shortestDuration = dist;
          nearestDriver = driver;
        }
      }
    }

    const rideRoadData = await getRoadDistance(
      pickup.lng, pickup.lat,
      destination.lng, destination.lat
    );

    const rideDistanceKm = rideRoadData
      ? rideRoadData.distanceKm
      : haversineDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);

    const fare = calculateFare(rideDistanceKm);

    await Ride.findByIdAndUpdate(rideId, {
      driverId: nearestDriver._id,
      fare,
      status: 'requested'
    });

    // Notify the matched driver
    io.to(`driver:${nearestDriver.userId}`).emit('ride:newRequest', {
      rideId,
      pickup,
      destination,
      fare,
      roadDistance: rideRoadData ? `${rideRoadData.distanceKm} km` : null
    });

    // Notify the rider that matching succeeded
    io.to(`ride:${rideId}`).emit('ride:matched', {
      rideId,
      estimatedDriverArrival: nearestDriverInfo
        ? `${nearestDriverInfo.durationMins} mins`
        : 'Calculating...',
      roadDistance: rideRoadData
        ? `${rideRoadData.distanceKm} km`
        : 'Calculating...',
      estimatedFare: '₹' + fare
    });

  }, { connection });

  worker.on('completed', (job) => {
    console.log(`Ride match job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Ride match job ${job.id} failed:`, err.message);
  });

  return worker;
}

module.exports = startRideMatchWorker;