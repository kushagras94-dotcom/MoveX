const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  requestRide,
  acceptRide,
  rejectRide,
  updateRideStatus,
  getMyRides,
  getRide
} = require('../controllers/rideController');
const { rideRequestLimiter } = require('../config/rateLimiter');


//router.post('/request', authMiddleware, requestRide);
router.put('/accept/:id', authMiddleware, acceptRide);
router.put('/reject/:id', authMiddleware, rejectRide);
router.put('/status/:id', authMiddleware, updateRideStatus);
router.get('/my-rides', authMiddleware, getMyRides);
router.get('/:id', authMiddleware, getRide);
router.post('/request', authMiddleware, rideRequestLimiter, requestRide);

module.exports = router;