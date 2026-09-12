const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createDriverProfile,
  updateLocation,
  toggleAvailability,
  getDriverProfile,
  getDriverStatus
} = require('../controllers/driverController');

router.post('/profile', authMiddleware, createDriverProfile);
router.put('/location', authMiddleware, updateLocation);
router.put('/availability', authMiddleware, toggleAvailability);
router.get('/profile', authMiddleware, getDriverProfile);
router.get('/status', authMiddleware, getDriverStatus);

module.exports = router;