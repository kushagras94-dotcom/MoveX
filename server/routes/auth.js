const express = require('express');
const router = express.Router();
const { register, login, getMe,logout} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../config/rateLimiter');

// router.post('/register', register);
// router.post('/login', login);
router.get('/me', authMiddleware, getMe);
router.post('/logout', authMiddleware, logout);
router.post('/login', loginLimiter, login);
router.post('/register', registerLimiter, register);

module.exports = router;