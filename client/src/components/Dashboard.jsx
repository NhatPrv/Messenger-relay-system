import React, { useEffect, useRef, useState } from 'react';
import { 
  MessageSquare, Radio, ShieldCheck, 
  Trash2, Volume2, VolumeX, LogOut, 
  RefreshCw, Clock, Users, Server
} from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import MessageItem from './MessageItem';

const Dashboard = ({ token, socketConnected, messages, onClearMessages, onLogout, serverStatus, fetchStatus }) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const feedEndRef = useRef(null);
  const prevMessagesCountRef = useRef(messages.length);

  // Play synthetic notification sound
  const playSoundNotification = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Dual oscillator synth beep
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

  return (
    <div className="dashboard-container">
      {/* SIDEBAR PANEL */}
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
                <MessageSquare size={18} />
              </div>
              <div className="stat-data">
                <span className="stat-label">Relayed Messages</span>
                <span className="stat-value">{messages.length}</span>
              </div>
            </div>

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

      {/* MAIN INBOX PANEL */}
      <main className="glass-card inbox-panel">
        <div className="inbox-header">
          <div className="inbox-title-wrapper">
            <h2 className="inbox-title">Messenger Inbox Stream</h2>
            <p className="inbox-subtitle">Realtime feed of incoming Facebook client messages</p>
          </div>

          <div className="inbox-actions">
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

            {/* Clear messages list */}
            <button 
              className="btn-circle" 
              onClick={onClearMessages}
              title="Clear Inbox Display"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {/* Inbox Stream */}
        <div className="message-feed">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon-wrapper">
                <MessageSquare size={36} />
              </div>
              <h3 className="empty-title">Inbox is Empty</h3>
              <p className="empty-subtitle">
                Waiting for incoming Messenger messages. If you are testing, make sure FB_MOCK_MODE=true is enabled on the server to push simulated data.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageItem 
                key={`${msg.timestamp}-${index}`} 
                data={msg} 
                isNew={index === messages.length - 1} // highlight latest message
              />
            ))
          )}
          <div ref={feedEndRef} />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
