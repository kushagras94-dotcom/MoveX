const jwt = require('jsonwebtoken');

const redisClient = require('../config/redisClient');


module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if(isBlacklisted){
      return res.status(401).json({ message: 'Token has been logged out' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (error) {
    res.status(401).json({ message: 'Token is invalid' });
  }
};