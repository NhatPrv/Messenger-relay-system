const express = require('express');
const router = express.Router();
const facebookService = require('../services/facebookService');
const socketHandler = require('../socket/socketHandler');

const serverStartTime = Date.now();

// GET /api/status - Get system and session statuses
router.get('/status', (req, res) => {
  const fbStatus = facebookService.getStatus();
  const connectedClients = socketHandler.getConnectedClientsCount();
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000); // in seconds

  res.json({
    status: 'ok',
    uptime,
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    facebook: fbStatus,
    websocket: {
      connectedClients
    }
  });
});

module.exports = router;
