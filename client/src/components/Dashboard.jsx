import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, Radio, ShieldCheck, 
  Volume2, VolumeX, LogOut, 
  RefreshCw, Clock, Users, Server, Key,
  Send, Search, User, MessageCircle
} from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import MessageItem from './MessageItem';

const Dashboard = ({ 
  token, 
  socketConnected, 
  threads, 
  activeThreadId, 
  setActiveThreadId, 
  messages, 
  onLogout, 
  serverStatus, 
  fetchStatus 
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appStateInput, setAppStateInput] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [submittingModal, setSubmittingModal] = useState(false);
  
  // New States
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const feedEndRef = useRef(null);
  const prevMessagesCountRef = useRef(messages.length);

  // Play synthetic notification sound
  const playSoundNotification = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime); // A5 note

      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio notification failed:', e);
    }
  };

  // Scroll to bottom on new messages and play sound
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      playSoundNotification();
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages, soundEnabled]);

  // Jump to bottom immediately when switching active thread
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeThreadId]);

  // Format server uptime
  const formatUptime = (seconds) => {
    if (seconds === undefined) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Format RAM usage in MB
  const formatRAM = (rssBytes) => {
    if (!rssBytes) return '--';
    return `${Math.round(rssBytes / 1024 / 1024)} MB`;
  };

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'FB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format date/time for thread item
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Handle saving the Facebook appState
  const handleSaveAppState = async (e) => {
    e.preventDefault();
    if (!appStateInput.trim()) {
      setModalError('Vui lòng dán JSON AppState vào đây.');
      return;
    }

    setModalError('');
    setModalSuccess('');
    setSubmittingModal(true);

    try {
      const response = await fetch('/api/facebook/appstate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ appState: appStateInput.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setModalSuccess('Đã cấu hình thành công! Đang kết nối lại Facebook...');
        setAppStateInput('');
        setTimeout(() => {
          setIsModalOpen(false);
          setModalSuccess('');
          fetchStatus(); // refresh stats immediately
        }, 2000);
      } else {
        setModalError(data.error || 'Có lỗi xảy ra khi lưu cấu hình.');
      }
    } catch (err) {
      setModalError(err.message || 'Không thể kết nối đến server.');
    } finally {
      setSubmittingModal(false);
    }
  };

  // Handle sending a reply message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeThreadId || sendingMessage) return;

    const msgText = messageInput.trim();
    setMessageInput('');
    setSendingMessage(true);

    try {
      const response = await fetch('/api/facebook/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          threadID: activeThreadId,
          message: msgText
        })
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Failed to send message:', data.error);
        setMessageInput(msgText); // Restore input if failed
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessageInput(msgText); // Restore input on error
    } finally {
      setSendingMessage(false);
    }
  };

  // Filter threads based on search input
  const filteredThreads = threads.filter(thread => 
    thread.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (thread.snippet && thread.snippet.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeThread = threads.find(t => t.threadID === activeThreadId);

  return (
    <div className="dashboard-container">
      {/* 1. SIDEBAR PANEL */}
      <aside className="glass-card sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Radio size={22} className="sidebar-icon" />
          </div>
          <span className="sidebar-title">Relay System</span>
        </div>

        {/* Connection Status Section */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Connectivity Status</h4>
          <StatusIndicator socketConnected={socketConnected} serverStatus={serverStatus} />
        </div>

        {/* Server & Data Stats Section */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Session Stats</h4>
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <Clock size={18} />
              </div>
              <div className="stat-data">
                <span className="stat-label">Server Uptime</span>
                <span className="stat-value">{formatUptime(serverStatus?.uptime)}</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <Server size={18} />
              </div>
              <div className="stat-data">
                <span className="stat-label">Memory Usage</span>
                <span className="stat-value">{formatRAM(serverStatus?.memoryUsage?.rss)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          <button 
            className="btn btn-logout" 
            onClick={onLogout}
          >
            <LogOut size={16} />
            Logout Session
          </button>
        </div>
      </aside>

      {/* 2. THREADS LIST PANEL */}
      <div className="glass-card threads-panel">
        <div className="threads-header">
          <h3 className="threads-title">Conversations</h3>
          <div className="search-bar-wrapper">
            <Search size={16} className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="threads-list">
          {filteredThreads.length === 0 ? (
            <div className="empty-threads">
              <span className="empty-threads-text">No chats found.</span>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <div 
                key={thread.threadID} 
                className={`thread-item-card ${activeThreadId === thread.threadID ? 'active' : ''} ${thread.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => setActiveThreadId(thread.threadID)}
              >
                <div className="thread-avatar-wrapper">
                  <div className="thread-avatar">
                    {thread.isGroup ? <Users size={16} /> : getInitials(thread.name)}
                  </div>
                  <div className="thread-avatar-badge">
                    <MessageCircle size={8} fill="white" stroke="none" />
                  </div>
                </div>

                <div className="thread-details">
                  <div className="thread-info-row">
                    <span className="thread-name">{thread.name}</span>
                    <span className="thread-time">{formatDate(thread.timestamp)}</span>
                  </div>
                  <div className="thread-snippet-row">
                    <span className="thread-snippet">
                      {thread.isSelfSnippet ? 'Bạn: ' : ''}{thread.snippet}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="thread-unread-badge">{thread.unreadCount}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. CHAT PANEL (right) */}
      <main className="glass-card chat-panel">
        {activeThreadId ? (
          <>
            {/* Active Thread Header */}
            <div className="chat-header">
              <div className="chat-active-info">
                <div className="thread-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                  {activeThread?.isGroup ? <Users size={16} /> : getInitials(activeThread?.name)}
                </div>
                <div>
                  <h3 className="chat-active-name">{activeThread?.name || 'Facebook User'}</h3>
                  <span className="chat-active-status">
                    {socketConnected ? 'Real-time Link Active' : 'Offline'}
                  </span>
                </div>
              </div>

              <div className="chat-actions">
                {/* Facebook Config AppState Modal Toggle */}
                <button 
                  className="btn-circle" 
                  onClick={() => setIsModalOpen(true)}
                  title="Cấu hình Token Facebook (AppState)"
                >
                  <Key size={18} />
                </button>

                {/* Audio Toggle */}
                <button 
                  className="btn-circle" 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Disable Notification Sound' : 'Enable Notification Sound'}
                >
                  {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>

                {/* Force Refresh status */}
                <button 
                  className="btn-circle" 
                  onClick={fetchStatus}
                  title="Refresh Status Metrics"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </div>

            {/* Chat Messages List */}
            <div className="chat-feed">
              {messages.length === 0 ? (
                <div className="empty-chat-feed">
                  <span className="empty-chat-text">Chưa có tin nhắn trong cuộc trò chuyện này.</span>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <MessageItem 
                    key={msg.messageID || `${msg.timestamp}-${index}`} 
                    data={msg} 
                    isNew={index === messages.length - 1}
                  />
                ))
              )}
              <div ref={feedEndRef} />
            </div>

            {/* Chat Reply Message Footer Input */}
            <form className="chat-footer-form" onSubmit={handleSendMessage}>
              <input 
                type="text" 
                className="chat-input-field" 
                placeholder="Nhập tin nhắn để trả lời..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                disabled={sendingMessage}
              />
              <button 
                type="submit" 
                className="chat-send-btn" 
                disabled={!messageInput.trim() || sendingMessage}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon-wrapper">
              <MessageSquare size={36} />
            </div>
            <h3 className="empty-title">Không có cuộc trò chuyện nào được chọn</h3>
            <p className="empty-subtitle">
              Hãy chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu xem và trả lời toàn bộ lịch sử tin nhắn.
            </p>
            <button 
              className="btn btn-primary" 
              style={{ width: 'auto', marginTop: '1.5rem', padding: '0.75rem 1.5rem' }}
              onClick={() => setIsModalOpen(true)}
            >
              <Key size={16} /> Cấu hình tài khoản Facebook
            </button>
          </div>
        )}
      </main>

      {/* FB CONFIG MODAL OVERLAY */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-card">
            <div className="modal-header">
              <div className="modal-icon-wrapper">
                <Key size={20} />
              </div>
              <div>
                <h3 className="modal-title">Cấu hình Token Facebook</h3>
                <p className="modal-subtitle">Dán JSON AppState (Cookie) tài khoản Facebook nhận tin nhắn</p>
              </div>
            </div>

            <form onSubmit={handleSaveAppState}>
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">AppState JSON Array</label>
                  <textarea
                    className="form-input textarea-appstate"
                    placeholder='[{"key": "c_user", "value": "..."}, {"key": "xs", "value": "..."}]'
                    value={appStateInput}
                    onChange={(e) => setAppStateInput(e.target.value)}
                    disabled={submittingModal}
                    rows={8}
                    style={{ 
                      fontFamily: 'monospace', 
                      fontSize: '0.85rem',
                      resize: 'vertical',
                      paddingLeft: '1rem' 
                    }}
                  />
                </div>
                <p className="modal-help-text">
                  Dùng extension trên trình duyệt (như <i>Get Token Cookie</i> hoặc <i>c3c-fbstate</i>) để lấy cookie dưới dạng JSON, dán vào ô trên và lưu lại.
                </p>

                {modalError && (
                  <div className="error-banner" style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>⚠️ {modalError}</span>
                  </div>
                )}

                {modalSuccess && (
                  <div className="success-banner" style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>✅ {modalSuccess}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-logout" 
                  style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalError('');
                    setModalSuccess('');
                  }}
                  disabled={submittingModal}
                >
                  Đóng
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.5rem 1.25rem' }}
                  disabled={submittingModal}
                >
                  {submittingModal ? 'Đang lưu...' : 'Lưu & Kết nối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
