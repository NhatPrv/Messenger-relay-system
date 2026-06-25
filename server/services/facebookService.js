const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const mockService = require('./mockService');

class FacebookService {
  constructor() {
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'mock' | 'error'
    this.errorDetails = null;
    this.api = null;
    this.userCache = {}; // senderID -> { name, profileUrl }
    this.onMessageCallback = null;
    
    // Load cache from disk if it exists
    this.cachePath = path.join(__dirname, '../logs/user_cache.json');
    this.loadUserCache();
  }

  loadUserCache() {
    try {
      if (fs.existsSync(this.cachePath)) {
        this.userCache = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
        logger.info(`Loaded ${Object.keys(this.userCache).length} users from cache.`);
      }
    } catch (err) {
      logger.error('Failed to load user cache:', err);
    }
  }

  saveUserCache() {
    try {
      const dir = path.dirname(this.cachePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cachePath, JSON.stringify(this.userCache, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save user cache:', err);
    }
  }

  getStatus() {
    return {
      status: this.status,
      errorDetails: this.errorDetails,
      cachedUsersCount: Object.keys(this.userCache).length
    };
  }

  async start(onMessageCallback) {
    this.onMessageCallback = onMessageCallback;
    const mockMode = process.env.FB_MOCK_MODE === 'true';
    const appStatePath = process.env.FB_APPSTATE_PATH || './appstate.json';
    const resolvedPath = path.resolve(appStatePath);

    if (mockMode) {
      logger.info('FB_MOCK_MODE is enabled in environment variables. Starting mock service.');
      this.status = 'mock';
      mockService.start(onMessageCallback);
      return;
    }

    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`appstate.json not found at ${resolvedPath}. Falling back to Mock Mode.`);
      this.status = 'mock';
      this.errorDetails = 'appstate.json not found. Running in Mock Mode.';
      mockService.start(onMessageCallback);
      return;
    }

    this.status = 'connecting';
    logger.info(`Attempting to login to Facebook using appstate at: ${resolvedPath}`);

    try {
      // Safely import fca-unofficial (catch native binding or install issues)
      let login;
      try {
        login = require('fca-unofficial');
      } catch (err) {
        logger.error('Failed to require "fca-unofficial" module. Falling back to Mock Mode.', err);
        this.status = 'mock';
        this.errorDetails = 'fca-unofficial package loading failed. Running in Mock Mode.';
        mockService.start(onMessageCallback);
        return;
      }

      const appState = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

      login({ appState }, (err, api) => {
        if (err) {
          logger.error('Facebook login failed:', err);
          this.status = 'error';
          this.errorDetails = err.message || 'Facebook login error';
          logger.warn('Falling back to Mock Mode due to login failure.');
          mockService.start(onMessageCallback);
          return;
        }

        logger.info('Successfully logged into Facebook.');
        this.status = 'connected';
        this.errorDetails = null;
        this.api = api;

        // Configure api listening
        api.setOptions({
          listenEvents: true,
          selfListen: false
        });

        // Start listening to MQTT messages
        api.listenMqtt((listenErr, event) => {
          if (listenErr) {
            logger.error('Error in Facebook MQTT listener:', listenErr);
            this.status = 'error';
            this.errorDetails = listenErr.message || 'MQTT listener error';
            return;
          }

          if (event.type === 'message') {
            this.handleIncomingMessage(event);
          }
        });
      });

    } catch (err) {
      logger.error('Unexpected error during Facebook service startup:', err);
      this.status = 'error';
      this.errorDetails = err.message || 'Unexpected service error';
      logger.warn('Falling back to Mock Mode.');
      this.status = 'mock';
      mockService.start(onMessageCallback);
    }
  }

  async handleIncomingMessage(event) {
    const senderID = event.senderID;
    const body = event.body;
    const timestamp = parseInt(event.timestamp) || Date.now();

    // Skip empty or attachment-only messages that don't have text body (optional, can extend)
    if (!body) return;

    logger.info(`New message received from Facebook sender ID: ${senderID}`);

    let senderName = `Facebook User (${senderID})`;
    const profileUrl = `https://facebook.com/${senderID}`;

    try {
      if (this.userCache[senderID]) {
        senderName = this.userCache[senderID].name;
      } else if (this.api) {
        // Fetch sender name from API
        logger.debug(`Fetching user info for ID: ${senderID}`);
        await new Promise((resolve) => {
          this.api.getUserInfo(senderID, (err, info) => {
            if (!err && info && info[senderID]) {
              senderName = info[senderID].name || senderName;
              this.userCache[senderID] = {
                name: senderName,
                profileUrl
              };
              this.saveUserCache();
            } else {
              logger.warn(`Could not fetch user name for ID ${senderID}:`, err);
            }
            resolve();
          });
        });
      }
    } catch (err) {
      logger.error(`Error resolving sender details for ID ${senderID}:`, err);
    }

    const payload = {
      senderName,
      profileUrl,
      message: body,
      timestamp
    };

    if (this.onMessageCallback) {
      this.onMessageCallback(payload);
    }
  }

  stop() {
    // If running mock mode, stop mock
    mockService.stop();
    
    if (this.api) {
      logger.info('Stopping Facebook Service listener...');
      try {
        this.api.logout();
      } catch (e) {
        logger.error('Error logging out from FB API:', e);
      }
      this.api = null;
    }
    this.status = 'disconnected';
  }

  async restart() {
    logger.info('Restarting Facebook Service listener...');
    this.stop();
    await this.start(this.onMessageCallback);
  }
}

module.exports = new FacebookService();
