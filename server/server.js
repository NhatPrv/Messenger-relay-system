require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const logger = require('./utils/logger');
const socketHandler = require('./socket/socketHandler');
const facebookService = require('./services/facebookService');

// Routers
const authRoutes = require('./routes/auth');
const statusRoutes = require('./routes/status');

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// Log HTTP requests
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', statusRoutes);

// Serve Web Client static assets in production if built
const clientBuildPath = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuildPath)) {
  logger.info(`Serving client static assets from ${clientBuildPath}`);
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  logger.info('Client production build not found. Running in API-only mode.');
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize Socket.io WebSocket server
socketHandler.init(server);

// Start listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  
  // Start the Facebook Service
  facebookService.start((messagePayload) => {
    // Broadcast Facebook messages via socket handler
    socketHandler.broadcastMessage(messagePayload);
  });
});

// Graceful shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

function shutdown() {
  logger.info('Shutting down server gracefully...');
  facebookService.stop();
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
}
