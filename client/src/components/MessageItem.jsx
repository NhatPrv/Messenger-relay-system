import React from 'react';
import { ExternalLink, MessageCircle } from 'lucide-react';

const MessageItem = ({ data, isNew }) => {
  const { senderName, profileUrl, message, timestamp } = data;

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'FB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format timestamp (hh:mm:ss dd/mm/yyyy)
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds} - ${day}/${month}`;
  };

  return (
    <div className={`message-card ${isNew ? 'new-pulse' : ''}`}>
      {/* Avatar with Facebook badge */}
      <div className="avatar-wrapper">
        <div className="avatar">
          {getInitials(senderName)}
        </div>
        <div className="avatar-badge" title="Messenger Source">
          <MessageCircle size={10} fill="white" stroke="none" />
        </div>
      </div>

      {/* Message Text Content */}
      <div className="message-content-wrapper">
        <div className="message-info-header">
          <a 
            href={profileUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="sender-name-link"
            title="Click to view Facebook profile"
          >
            {senderName}
            <ExternalLink size={12} strokeWidth={2.5} />
          </a>
          <span className="message-time">{formatTime(timestamp)}</span>
        </div>
        <div className="message-bubble">
          {message}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
