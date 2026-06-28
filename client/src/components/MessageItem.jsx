import React from 'react';
import { MessageCircle } from 'lucide-react';

const MessageItem = ({ data, isNew }) => {
  const { senderName, senderID, message, timestamp, isSelf } = data;

  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return 'FB';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format timestamp (hh:mm)
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (isSelf) {
    return (
      <div className={`chat-message-row self ${isNew ? 'new-pulse' : ''}`}>
        <div className="chat-message-bubble-wrapper">
          <div className="chat-message-bubble" title={new Date(timestamp).toLocaleString()}>
            {message}
          </div>
          <span className="chat-message-time">{formatTime(timestamp)}</span>
        </div>
      </div>
    );
  }

  const profileUrl = senderID ? `https://facebook.com/${senderID}` : null;

  return (
    <div className={`chat-message-row partner ${isNew ? 'new-pulse' : ''}`}>
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
      <div className="chat-message-content-wrapper">
        <div className="chat-message-info">
          {profileUrl ? (
            <a 
              href={profileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="chat-sender-name"
              title="Click to view Facebook profile"
            >
              {senderName}
            </a>
          ) : (
            <span className="chat-sender-name">{senderName}</span>
          )}
        </div>
        <div className="chat-message-bubble-wrapper">
          <div className="chat-message-bubble" title={new Date(timestamp).toLocaleString()}>
            {message}
          </div>
          <span className="chat-message-time">{formatTime(timestamp)}</span>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
