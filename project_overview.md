# Messenger Relay System - Tổng quan Dự án & Lộ trình Phát triển

Tài liệu này tóm tắt toàn bộ cấu trúc công nghệ, các chức năng đã hoàn thiện và định hướng phát triển tiếp theo của hệ thống **Messenger Relay System**. Nó được thiết kế nhằm giúp các nhà phát triển (Developers) hoặc các mô hình AI khác có thể nhanh chóng nắm bắt trạng thái dự án để tiếp tục làm việc.

---

## 🛠️ Công nghệ Sử dụng (Technology Stack)

### Backend (Server)
* **Runtime:** Node.js (>= 16)
* **Framework:** Express.js (Xây dựng REST API)
* **Real-time Communication:** Socket.io (Giao tiếp hai chiều thời gian thực giữa Server và Client)
* **Facebook Integration:** `@dongdev/fca-unofficial` (Thư viện kết nối và lắng nghe sự kiện từ Facebook Chat)
* **Authentication:** JSON Web Tokens (JWT) & BcryptJS (Mã hóa mật khẩu và xác thực kết nối Socket)
* **Logging:** Winston Logger (Ghi nhận hoạt động hệ thống và lỗi)

### Frontend (Client)
* **Framework:** React.js (phiên bản 18, xây dựng bằng Vite)
* **Styling:** Vanilla CSS (Glassmorphism Dark-theme, thiết kế hiện đại, tối giản và đáp ứng tốt trên các thiết bị)
* **Icons:** Lucide-React
* **Real-time Communication:** Socket.io-client

### DevOps & Cấu hình môi trường
* **Docker & Docker Compose:** Đóng gói ứng dụng thành multi-container (client + server)
* **Web Server/Reverse Proxy:** Nginx (Sử dụng để phục vụ static assets của React và proxy ngược các request API/WebSockets về backend)

---

## 📂 Kiến trúc & Cấu trúc Thư mục Chính

```text
Messenger-relay-system/
├── docker-compose.yml          # Cấu hình container Docker chạy đồng thời frontend + backend
├── project_overview.md         # Bản tóm tắt này
├── server/                     # Backend Node.js
│   ├── server.js               # Entry point khởi chạy Express và Socket.io
│   ├── .env.example            # Bản mẫu cấu hình môi trường (.env)
│   ├── routes/                 # Xử lý API endpoints (auth, status, facebook)
│   ├── services/               # Chứa facebookService.js điều hướng kết nối facebook
│   └── socket/                 # Xử lý các sự kiện socket.io kết nối với client
└── client/                     # Frontend React (Vite)
    ├── src/
    │   ├── main.jsx            # Điểm khởi chạy React
    │   ├── App.jsx             # Component cha quản lý trạng thái chính
    │   ├── index.css           # Cấu trúc stylesheet và thiết kế giao diện
    │   └── components/         # Login.jsx, Dashboard.jsx, MessageItem.jsx...
```

---

## ✅ Các Chức năng Đã Hoàn Thành (Implemented Features)

1. **Kết nối Facebook Real-time:** Lắng nghe và nhận tin nhắn trực tiếp từ tài khoản Facebook được liên kết.
2. **Web Dashboard Một Người Dùng:** Giao diện quản trị đơn giản, chuyên nghiệp với phong cách Glassmorphic Dark-theme.
3. **Xác thực JWT:** Bảo mật kết nối giữa Client và Server qua JWT Token, bảo vệ bằng mật khẩu quản trị (`ADMIN_PASSWORD`).
4. **Cập nhật tin nhắn thời gian thực:** Đồng bộ danh sách cuộc hội thoại (threads) và nội dung tin nhắn tự động thông qua WebSockets.
5. **Cấu hình Cookie qua giao diện:** Cho phép người dùng dán chuỗi Cookie/JSON từ trình duyệt trực tiếp trên giao diện Dashboard (lưu thành `appstate.json` trên server để tự động đăng nhập lại).
6. **Đèn báo trạng thái kết nối:** Chỉ báo trực quan trạng thái kết nối của máy chủ với Facebook và trạng thái kết nối WebSocket của người dùng.
7. **Đóng gói Docker:** Đầy đủ file cấu hình Dockerfile và docker-compose sẵn sàng cho việc triển khai lên các dịch vụ đám mây (AWS EC2, VPS).

---

## 🎯 Các Chức năng Tiếp Theo / Sẽ Làm (Future Roadmap)

1. **Hiển thị tên người gửi trong nhóm chat:**
   * *Chi tiết:* Hiện tại tin nhắn nhóm chưa hiện rõ tên người gửi cuối cùng trên danh sách tin nhắn. Cần bổ sung hiển thị tên người gửi tương ứng cho từng bong bóng tin nhắn trong nhóm chat.
2. **Tự động kết nối lại & làm mới phiên làm việc (Auto-reconnect & Session Renewal):**
   * *Chi tiết:* Tối ưu hóa facebookService để tự động khôi phục kết nối và nạp lại `appstate.json` khi phiên kết nối của Facebook bị gián đoạn.
3. **Hỗ trợ Tin nhắn Đa phương tiện (Media & Attachments Support):**
   * *Chi tiết:* Hỗ trợ hiển thị và gửi các tệp đính kèm như hình ảnh, video, âm thanh và tệp tin qua giao diện Dashboard.
4. **Tính năng tìm kiếm:**
   * *Chi tiết:* Thêm thanh tìm kiếm danh sách cuộc hội thoại (threads) hoặc tìm kiếm nội dung tin nhắn cũ.
5. **Quản lý danh sách nhiều tài khoản Facebook:**
   * *Chi tiết:* Nâng cấp hệ thống để hỗ trợ quản lý chuyển tiếp tin nhắn cho nhiều tài khoản Facebook cùng một lúc.

---

## 🚀 Hướng dẫn Bắt đầu Nhanh cho Dev / AI mới

1. **Thiết lập Môi trường:**
   * Đảm bảo đã cài đặt **Node.js (>= 16)** và **npm**.
   * Copy `server/.env.example` thành `server/.env` và cấu hình mật khẩu đăng nhập `ADMIN_PASSWORD`.
2. **Chạy Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
3. **Chạy Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
4. **Địa chỉ URL chạy cục bộ:**
   * Frontend: `http://localhost:3000`
   * Backend: `http://localhost:5000`
