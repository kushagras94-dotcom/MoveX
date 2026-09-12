const Driver = require('../models/Driver');

// REGISTER AS DRIVER (create driver profile)
exports.createDriverProfile = async (req, res) => {
  try {
    // Check if driver profile already exists
    const existingDriver = await Driver.findOne({ userId: req.user.id });
    if (existingDriver) {
      return res.status(400).json({ message: 'Driver profile already exists' });
    }

    const driver = await Driver.create({
      userId: req.user.id,
      location: {
        lat: req.body.lat || 26.9124,
        lng: req.body.lng || 75.7873
      }
    });

    res.status(201).json({ message: 'Driver profile created', driver });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE DRIVER LOCATION
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const driver = await Driver.findOneAndUpdate(
      { userId: req.user.id },
      { location: { lat, lng } },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    res.status(200).json({ message: 'Location updated', driver });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// TOGGLE AVAILABILITY
exports.toggleAvailability = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    driver.isAvailable = !driver.isAvailable;
    await driver.save();

    res.status(200).json({
      message: `You are now ${driver.isAvailable ? 'available' : 'unavailable'}`,
      driver
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET DRIVER PROFILE
exports.getDriverProfile = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id })
      .populate('userId', 'name email');

    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }

    res.status(200).json(driver);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getDriverStatus = async (req, res) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ message: 'Driver profile not found' });
    }
    res.status(200).json({ isAvailable: driver.isAvailable });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};