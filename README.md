# MessengerRelaySystem

Hệ thống nhận tin nhắn Facebook Messenger theo thời gian thực (real-time) và đẩy về giao diện quản trị Web Dashboard qua WebSocket.

Dự án được xây dựng theo kiến trúc **Single User System** (chỉ dành cho 1 người dùng quản trị) sử dụng:
*   **Server:** Node.js + Express + Socket.io + `fca-unofficial`.
*   **Client:** React.js (Vite) + Vanilla CSS (Giao diện tối giản Glassmorphic Dark-theme).

---

## 📁 Cấu trúc Thư mục

```text
MessengerRelaySystem/
├── docker-compose.yml          # Cấu hình khởi chạy multi-container
├── README.md                   # Hướng dẫn chi tiết dự án (bản này)
├── server/                     # Mã nguồn Backend Server
│   ├── .env.example            # Bản mẫu cấu hình môi trường
│   ├── Dockerfile              # Dockerfile build server
│   ├── package.json            # Thư viện server (Express, Socket.io)
│   ├── server.js               # Entry point khởi chạy server
│   ├── routes/                 # API Endpoints
│   │   ├── auth.js             # Route xử lý login Dashboard
│   │   ├── facebook.js         # API lấy danh sách chat, lịch sử tin nhắn & gửi phản hồi
│   │   └── status.js           # Route kiểm tra trạng thái hệ thống
│   ├── services/               # Logic nghiệp vụ chính
│   │   └── facebookService.js  # Kết nối Facebook, lấy danh sách cuộc hội thoại, lịch sử & gửi phản hồi
│   ├── socket/                 # Cấu hình WebSockets
│   │   └── socketHandler.js    # Quản lý kết nối JWT và Broadcast tin nhắn thời gian thực
│   └── utils/
│       └── logger.js           # Ghi log lỗi và console (Winston)
└── client/                     # Mã nguồn Frontend Web Client
    ├── Dockerfile              # Dockerfile build static website & Nginx
    ├── index.html              # Template HTML
    ├── package.json            # Thư viện frontend (React, Socket.io-client)
    ├── vite.config.js          # Cấu hình dev proxy
    └── src/
        ├── main.jsx            # Entry point React
        ├── App.jsx             # Quản lý auth state, danh sách cuộc trò chuyện & WebSocket listener
        ├── index.css           # Hệ thống CSS Premium Glassmorphism & Khung bong bóng chat
        └── components/         # Các React component giao diện
            ├── Login.jsx       # Form đăng nhập quản trị
            ├── Dashboard.jsx   # Giao diện chính dạng hai cột (Bảng danh sách chat & Khung hội thoại)
            ├── MessageItem.jsx # Khung hiển thị bong bóng tin nhắn (gửi/nhận)
            └── StatusIndicator.jsx # Đèn báo trạng thái kết nối
```

---

## ⚡ Bắt đầu Nhanh (Chạy Local)

### Bước 1: Thiết lập cấu hình (.env)

Tại thư mục `/server`, sao chép file `.env.example` thành `.env`:
```bash
cd server
cp .env.example .env
```

Mở file `.env` và điều chỉnh:
*   `ADMIN_PASSWORD`: Mật khẩu đăng nhập vào Web Dashboard.
*   `JWT_SECRET`: Khóa bí mật dùng để mã hóa session token.

### Bước 2: Chạy Server (Backend)

Cài đặt các thư viện và khởi chạy server dev:
```bash
cd server
npm install
npm run start
```
*Server sẽ lắng nghe trên cổng `5000`.*

### Bước 3: Chạy Client (Frontend)

Mở một tab Terminal mới, truy cập thư mục `/client`, cài đặt thư viện và chạy frontend dev:
```bash
cd client
npm install
npm run dev
```
*Client sẽ chạy tại địa chỉ `http://localhost:3000`.*

Mở trình duyệt, truy cập `http://localhost:3000` và nhập mật khẩu bạn đã thiết lập trong file `.env` để xem tin nhắn.

---

## 🍪 Hướng dẫn đăng nhập tài khoản Facebook truyền tin

Khi chạy dự án, bạn cần liên kết tài khoản Facebook dùng để lắng nghe tin nhắn:

1. **Lấy chuỗi Cookie Facebook:**
   * Đăng nhập tài khoản Facebook của bạn trên trình duyệt.
   * Cài đặt một Chrome Extension dùng để xuất Cookie dưới dạng JSON hoặc chuỗi Text (Ví dụ: *c3c-fbstate* hoặc *Get Token Cookie*).
   * Bấm vào tiện ích và sao chép (copy) chuỗi Cookie hoặc JSON nhận được.
2. **Cấu hình trên Dashboard:**
   * Truy cập dashboard tại địa chỉ `http://localhost:5000` (hoặc cổng `3000` ở chế độ dev).
   * Đăng nhập bằng mật khẩu quản trị (`ADMIN_PASSWORD`).
   * Nhấp vào biểu tượng chiếc **chìa khóa 🔑** ở góc trên cùng bên phải.
   * Dán chuỗi Cookie/JSON bạn vừa copy vào ô nhập và nhấn **Lưu & Kết nối**.
3. **Hoàn tất:**
   * Máy chủ sẽ lưu cookie này dưới dạng `appstate.json`, tự động kết nối và bắt đầu chuyển tiếp tin nhắn thời gian thực về Dashboard.

> [!WARNING]
> **Khuyến cáo Bảo mật:** File `appstate.json` trên server chứa thông tin đăng nhập của bạn dưới dạng cookie. Thư mục này đã được cấu hình trong `.gitignore` để tránh bị đẩy lên GitHub công khai. Tuyệt đối không chia sẻ file này cho người khác.

---

## 🚀 Hướng dẫn Deploy lên AWS EC2 (Ubuntu)

Có 2 cách deploy phổ biến trên AWS EC2 chạy hệ điều hành Ubuntu: **Sử dụng Docker Compose (Khuyên dùng)** hoặc **Chạy trực tiếp bằng pm2**.

### Cách 1: Deploy bằng Docker Compose (Khuyên dùng)

#### Bước 1: Cài đặt Docker & Docker Compose trên EC2
Đăng nhập vào EC2 qua SSH và chạy các lệnh cài đặt sau:
```bash
# Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# Cài đặt Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# Cài đặt Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### Bước 2: Clone dự án và cấu hình
```bash
# Clone dự án từ git
git clone https://github.com/NhatPrv/Messenger-relay-system.git
cd Messenger-relay-system

# Tạo file .env cho Server
cp server/.env.example server/.env
nano server/.env # Sửa ADMIN_PASSWORD và JWT_SECRET
```
*Tạo và lưu file `appstate.json` của bạn vào thư mục `server/appstate.json` nếu bạn chạy với tài khoản thật (hoặc dán qua nút chìa khóa trên giao diện).*

#### Bước 3: Khởi chạy dự án bằng Docker Compose
Tại thư mục gốc của dự án, chạy lệnh:
```bash
sudo docker-compose up -d --build
```
* Docker sẽ build mã nguồn client thành static assets, đưa vào Nginx chạy trên cổng `80` (Web Client).
* Server API và WebSocket sẽ chạy trên cổng `5000`.

---

### Cách 2: Deploy trực tiếp bằng Node.js & PM2 (Không dùng Docker)

Nếu không muốn dùng Docker, bạn có thể chạy ứng dụng trực tiếp bằng PM2:

#### Bước 1: Cài đặt Node.js, Nginx & PM2 trên EC2
```bash
# Cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt PM2 toàn cục
sudo npm install pm2 -g

# Cài đặt Nginx
sudo apt install nginx -y
```

#### Bước 2: Build Client
1. Cài đặt các package của client:
   ```bash
   cd client
   npm install
   ```
2. Mở file `client/src/App.jsx` và chỉnh sửa dòng `socketUrl` nếu cần thiết (hoặc để mặc định).
3. Build ứng dụng React:
   ```bash
   npm run build
   ```
   *Kết quả build tĩnh nằm ở thư mục `client/dist`.*

#### Bước 3: Cấu hình Nginx để phục vụ Client và Proxy API
Cấu hình Nginx để phục vụ giao diện Web và proxy ngược các request API/WebSocket về phía Node.js Server.
Mở file config mặc định của Nginx:
```bash
sudo nano /etc/nginx/sites-available/default
```
Thay đổi nội dung file thành:
```nginx
server {
    listen 80;
    server_name _;

    # Phục vụ thư mục build của React Client
    location / {
        root /home/ubuntu/Messenger-relay-system/client/dist;
        index index.html;
        try_files $uri /index.html;
    }

    # Proxy các API request về Backend Server port 5000
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Proxy các kết nối Socket.io WebSocket về port 5000
    location /socket.io/ {
        proxy_pass http://localhost:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Kiểm tra cấu hình Nginx và restart dịch vụ:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

#### Bước 4: Chạy Server bằng PM2
Di chuyển về thư mục `server`, cài đặt dependency và chạy:
```bash
cd ../server
npm install
pm2 start server.js --name "messenger-relay"
pm2 save
pm2 startup
```

---

### 🔒 Cấu hình Cổng Mạng (Security Group) trên AWS
Để ứng dụng hoạt động chính xác từ bên ngoài, bạn cần truy cập vào trang quản trị AWS Console, vào cài đặt **Security Group** của EC2 và mở các cổng sau (Inbound Rules):

| Type | Port Range | Source | Description |
|---|---|---|---|
| **HTTP (TCP)** | `80` | `0.0.0.0/0` | Cho phép truy cập giao diện Web Dashboard |
| **Custom TCP** | `5000` | `0.0.0.0/0` | Cho phép kết nối API & WebSocket (Nếu dùng Docker Compose trực tiếp) |
| **SSH (TCP)** | `22` | IP của bạn | Dùng để quản trị server |
