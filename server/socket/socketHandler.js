const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class SocketHandler {
  constructor() {
    this.io = null;
    this.connectedClients = 0;
  }

  init(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins for simplicity (can restrict to dashboard URL in prod)
        methods: ['GET', 'POST']
      }
    });

    // JWT verification middleware for WebSocket connections
    this.io.use((socket, next) => {
      const token = socket.handshake.query.token;

      if (!token) {
        logger.warn('Socket connection rejected: No authentication token provided.');
        return next(new Error('Authentication error: Token required.'));
      }

      try {
        const jwtSecret = process.env.JWT_SECRET || 'super_secret_session_key_change_me';
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = decoded; // Store decoded user details (e.g., username)
        next();
      } catch (err) {
        logger.warn(`Socket connection rejected: Invalid authentication token. Error: ${err.message}`);
        return next(new Error('Authentication error: Invalid token.'));
      }
    });

    this.io.on('connection', (socket) => {
      this.connectedClients++;
      logger.info(`Web client connected. Total clients: ${this.connectedClients} (Socket ID: ${socket.id})`);

      socket.on('disconnect', () => {
        this.connectedClients = Math.max(0, this.connectedClients - 1);
        logger.info(`Web client disconnected. Total clients: ${this.connectedClients} (Socket ID: ${socket.id})`);
      });
    });

    logger.info('Socket.io server initialized and secured with JWT verification.');
  }

  broadcastMessage(messagePayload) {
    if (!this.io) {
      logger.warn('Socket.io not initialized. Cannot broadcast message.');
      return;
    }
    
    logger.debug('Broadcasting message payload to all connected clients...');
    this.io.emit('new_message', messagePayload);
  }

  getConnectedClientsCount() {
    return this.connectedClients;
  }
}

module.exports = new SocketHandler();
