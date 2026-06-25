const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const facebookService = require('../services/facebookService');
const logger = require('../utils/logger');

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Supporting Bearer token or direct token string
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);
  
  if (!token) {
    logger.warn('Unauthorized access attempt: No JWT token provided.');
    return res.status(401).json({ error: 'Authentication token required.' });
  }
  
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_session_key_change_me';
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      logger.warn('Forbidden access attempt: Invalid JWT token.');
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// POST /api/facebook/appstate - Save appstate cookies and restart FB service
router.post('/appstate', authenticateToken, async (req, res) => {
  const { appState } = req.body;

  if (!appState) {
    return res.status(400).json({ error: 'AppState JSON is required.' });
  }

  try {
    // Validate that appState is a valid JSON array
    let parsedState;
    if (typeof appState === 'string') {
      parsedState = JSON.parse(appState.trim());
    } else {
      parsedState = appState;
    }

    if (!Array.isArray(parsedState)) {
      return res.status(400).json({ error: 'AppState must be a valid JSON array of cookies.' });
    }

    // Write file to target path
    const appStatePath = process.env.FB_APPSTATE_PATH || './appstate.json';
    const resolvedPath = path.resolve(appStatePath);

    fs.writeFileSync(resolvedPath, JSON.stringify(parsedState, null, 2), 'utf8');
    logger.info(`Successfully wrote new appstate.json to ${resolvedPath}`);

    // Update in-memory Mock Mode environment setting to false
    process.env.FB_MOCK_MODE = 'false';

    // Restart the Facebook Service in the background
    // Respond immediately to the client that it has started reconnecting
    facebookService.restart().catch(err => {
      logger.error('Error during background facebookService restart:', err);
    });

    return res.json({ 
      success: true, 
      message: 'AppState saved. Reconnecting to Facebook...' 
    });

  } catch (err) {
    logger.error('Failed to save AppState:', err);
    return res.status(400).json({ 
      error: 'Invalid JSON format. Please make sure you copied the correct cookies JSON array.' 
    });
  }
});

module.exports = router;
