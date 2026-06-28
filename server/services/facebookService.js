const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class FacebookService {
  constructor() {
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'connected' | 'error'
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
    const appStatePath = process.env.FB_APPSTATE_PATH || './appstate.json';
    const resolvedPath = path.resolve(appStatePath);

    if (!fs.existsSync(resolvedPath)) {
      logger.warn(`appstate.json not found at ${resolvedPath}. Waiting for cookies to be configured.`);
      this.status = 'error';
      this.errorDetails = 'Không tìm thấy file appstate.json. Vui lòng cấu hình Cookie bằng nút chìa khóa 🔑.';
      return;
    }

    this.status = 'connecting';
    logger.info(`Attempting to login to Facebook using appstate at: ${resolvedPath}`);

    try {
      // Safely import @dongdev/fca-unofficial (catch native binding or install issues)
      let login;
      try {
        login = require('@dongdev/fca-unofficial');
      } catch (err) {
        logger.error('Failed to require "@dongdev/fca-unofficial" module.', err);
        this.status = 'error';
        this.errorDetails = 'Không thể nạp thư viện @dongdev/fca-unofficial.';
        return;
      }

      const appState = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

      login({ appState }, { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }, (err, api) => {
        if (err) {
          logger.error('Facebook login failed:', err);
          this.status = 'error';
          this.errorDetails = err.message || 'Lỗi cookie đăng nhập Facebook (hết hạn hoặc sai định dạng)';
          return;
        }

        logger.info('Successfully logged into Facebook.');
        this.status = 'connected';
        this.errorDetails = null;
        this.api = api;

        // Configure api listening
        api.setOptions({
          listenEvents: true,
          selfListen: true
        });

        // Start listening to MQTT messages
        api.listenMqtt((listenErr, event) => {
          if (listenErr) {
            logger.error('Error in Facebook MQTT listener:', listenErr);
            this.status = 'error';
            this.errorDetails = listenErr.message || 'Lỗi mất kết nối MQTT';
            return;
          }

          logger.info(`Nhận được sự kiện từ Facebook (Event type): ${event.type}`);

          if (event.type === 'message' || event.type === 'message_reply') {
            this.handleIncomingMessage(event);
          }
        });
      });

    } catch (err) {
      logger.error('Unexpected error during Facebook service startup:', err);
      this.status = 'error';
      this.errorDetails = err.message || 'Lỗi hệ thống không xác định.';
    }
  }

  async handleIncomingMessage(event) {
    const senderID = event.senderID;
    const threadID = event.threadID || senderID;
    const body = event.body;
    const timestamp = parseInt(event.timestamp) || Date.now();

    // Skip empty or attachment-only messages that don't have text body
    if (!body) return;

    logger.info(`New message received in thread ${threadID} from sender ID: ${senderID}`);

    const isSelf = senderID === (this.api ? this.api.getCurrentUserID() : null);
    let senderName = isSelf ? 'Bạn' : `Facebook User (${senderID})`;
    const profileUrl = `https://facebook.com/${senderID}`;

    try {
      if (isSelf) {
        senderName = 'Bạn';
      } else if (this.userCache[senderID]) {
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
      threadID,
      senderID,
      senderName,
      profileUrl,
      message: body,
      timestamp,
      isSelf
    };

    if (this.onMessageCallback) {
      this.onMessageCallback(payload);
    }
  }

  async getThreads(limit = 50) {
    if (!this.api) return [];

    return new Promise((resolve) => {
      logger.info(`Fetching top ${limit} active chat threads...`);
      this.api.getThreadList(limit, null, ['INBOX'], (err, list) => {
        if (err || !list) {
          logger.error('Failed to fetch thread list:', err);
          return resolve([]);
        }

        const currentUserID = this.api.getCurrentUserID();
        const formattedThreads = list.map(thread => {
          const isSelfSnippet = thread.snippetSender === currentUserID;
          let name = thread.name || 'Facebook User';

          // Update cache with thread user name if it's a 1-to-1 chat
          if (!thread.isGroup && thread.threadID && thread.name && !isSelfSnippet) {
            this.userCache[thread.threadID] = {
              name: thread.name,
              profileUrl: `https://facebook.com/${thread.threadID}`
            };
          }

          return {
            threadID: thread.threadID,
            name: thread.name || 'Facebook User',
            unreadCount: thread.unreadCount || 0,
            isGroup: thread.isGroup || false,
            snippet: thread.snippet || '',
            snippetSender: thread.snippetSender,
            isSelfSnippet,
            timestamp: parseInt(thread.timestamp) || Date.now()
          };
        });

        // Save cache updates
        this.saveUserCache();
        resolve(formattedThreads);
      });
    });
  }

  async getThreadHistory(threadID, limit = 50) {
    if (!this.api) return [];

    return new Promise((resolve) => {
      logger.info(`Fetching history for thread ${threadID} (limit: ${limit})...`);
      this.api.getThreadHistory(threadID, limit, null, async (err, history) => {
        if (err || !history) {
          logger.error(`Failed to fetch history for thread ${threadID}:`, err);
          return resolve([]);
        }

        const currentUserID = this.api.getCurrentUserID();

        // Identify any unknown sender IDs to fetch names in batch
        const unknownSenderIDs = [...new Set(history
          .map(msg => msg.senderID)
          .filter(id => id && id !== currentUserID && !this.userCache[id])
        )];

        if (unknownSenderIDs.length > 0) {
          try {
            logger.info(`Fetching info for unknown senders in history: ${unknownSenderIDs.join(', ')}`);
            await new Promise((resolveInfo) => {
              this.api.getUserInfo(unknownSenderIDs, (errInfo, info) => {
                if (!errInfo && info) {
                  for (const id of unknownSenderIDs) {
                    if (info[id]) {
                      this.userCache[id] = {
                        name: info[id].name || `Facebook User (${id})`,
                        profileUrl: `https://facebook.com/${id}`
                      };
                    }
                  }
                  this.saveUserCache();
                } else {
                  logger.warn('Failed to fetch info for unknown senders:', errInfo);
                }
                resolveInfo();
              });
            });
          } catch (errInfoEx) {
            logger.error('Error fetching unknown senders info:', errInfoEx);
          }
        }

        // Format history messages
        const formattedMessages = history
          .filter(msg => msg.body || msg.snippet) // ensure there is some content
          .map(msg => {
            const senderID = msg.senderID;
            const isSelf = senderID === currentUserID;
            let senderName = 'Facebook User';

            if (isSelf) {
              senderName = 'Bạn';
            } else if (this.userCache[senderID]) {
              senderName = this.userCache[senderID].name;
            } else {
              senderName = `User (${senderID})`;
            }

            return {
              messageID: msg.messageID,
              senderID,
              senderName,
              message: msg.body || msg.snippet || '',
              timestamp: parseInt(msg.timestamp) || Date.now(),
              isSelf
            };
          });

        resolve(formattedMessages);
      });
    });
  }

  async sendMessage(threadID, message) {
    if (!this.api) {
      throw new Error('Facebook service is not connected.');
    }

    return new Promise((resolve, reject) => {
      logger.info(`Sending message to thread ${threadID}...`);
      this.api.sendMessage(message, threadID, (err, msgInfo) => {
        if (err) {
          logger.error(`Failed to send message to thread ${threadID}:`, err);
          return reject(err);
        }
        logger.info(`Successfully sent message to thread ${threadID}, msgID: ${msgInfo.messageID}`);
        resolve(msgInfo);
      });
    });
  }

  stop() {
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
