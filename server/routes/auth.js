const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// POST /api/auth/login - authenticate user with password
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'change_this_secure_password_123';
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_session_key_change_me';

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // Simple string comparison for admin password (single user local auth)
  if (password === adminPassword) {
    logger.info('Admin successfully authenticated.');
    
    // Generate JWT token
    const token = jwt.sign(
      { username: 'admin' }, 
      jwtSecret, 
      { expiresIn: '24h' }
    );

    return res.json({ token });
  } else {
    logger.warn('Failed login attempt with incorrect password.');
    return res.status(401).json({ error: 'Incorrect password' });
  }
});

module.exports = router;
