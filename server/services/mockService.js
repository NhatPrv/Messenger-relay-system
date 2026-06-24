const logger = require('../utils/logger');

const MOCK_USERS = [
  { name: 'Nguyễn Văn A', id: '10001' },
  { name: 'Trần Thị B', id: '10002' },
  { name: 'Lê Hoàng C', id: '10003' },
  { name: 'Phạm Minh D', id: '10004' },
  { name: 'Vũ Thanh E', id: '10005' }
];

const MOCK_MESSAGES = [
  "Chào bạn, dự án MessengerRelaySystem chạy ổn định quá!",
  "Facebook API hoặc session cookie đang hoạt động tốt đúng không?",
  "Tin nhắn này được đẩy realtime qua Socket.io này.",
  "Hôm nay bạn thế nào? Có lỗi gì phát sinh không?",
  "Tôi vừa gửi cho bạn một liên kết mới, hãy kiểm tra nhé.",
  "Demo giao diện Glassmorphism trông đẹp và hiện đại ghê!",
  "Test thử tin nhắn dài: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ok, khi nào rảnh thì phản hồi lại cho tôi nhé.",
  "Lệnh deploy lên AWS EC2 chạy mượt mà chứ?",
  "Chúc một ngày tốt lành nhé!"
];

class MockService {
  constructor() {
    this.intervalId = null;
    this.isActive = false;
  }

  start(onMessageCallback) {
    if (this.isActive) return;
    this.isActive = true;
    logger.info("Mock Facebook Service started. Generating simulated messages...");

    // Send an initial message shortly after starting
    setTimeout(() => {
      if (this.isActive) this.generateMessage(onMessageCallback);
    }, 3000);

    // Schedule periodic messages
    this.intervalId = setInterval(() => {
      this.generateMessage(onMessageCallback);
    }, 15000); // Send a message every 15 seconds
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info("Mock Facebook Service stopped.");
  }

  generateMessage(onMessageCallback) {
    const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
    const text = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
    
    const payload = {
      senderName: user.name,
      profileUrl: `https://facebook.com/${user.id}`,
      message: text,
      timestamp: Date.now()
    };

    logger.debug(`Generating mock message from ${payload.senderName}`);
    onMessageCallback(payload);
  }
}

module.exports = new MockService();
