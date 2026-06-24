import React from 'react';
import { Radio, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';

const StatusIndicator = ({ socketConnected, serverStatus }) => {
  const getFbStatusClass = () => {
    if (!serverStatus) return 'disconnected';
    switch (serverStatus.facebook?.status) {
      case 'connected':
        return 'connected';
      case 'mock':
        return 'mock';
      case 'connecting':
        return 'connecting';
      case 'error':
      default:
        return 'disconnected';
    }
  };

  const getFbStatusText = () => {
    if (!serverStatus) return 'Disconnected';
    switch (serverStatus.facebook?.status) {
      case 'connected':
        return 'Connected';
      case 'mock':
        return 'Mock Mode Active';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Login Error';
      default:
        return 'Disconnected';
    }
  };

  const fbStatusClass = getFbStatusClass();
  const fbStatusText = getFbStatusText();

  return (
    <div className="status-container">
      {/* WebSocket Status */}
      <div className="status-pill">
        <div className={`status-dot ${socketConnected ? 'connected' : 'disconnected'}`}></div>
        <div className="status-info">
          <span className="status-label">Websocket Gateway</span>
          <span className="status-value">{socketConnected ? 'Connected Realtime' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Facebook Session Status */}
      <div className="status-pill">
        <div className={`status-dot ${fbStatusClass}`}></div>
        <div className="status-info">
          <span className="status-label">Facebook Listener</span>
          <span className="status-value">{fbStatusText}</span>
          {serverStatus?.facebook?.errorDetails && (
            <span className="status-details">{serverStatus.facebook.errorDetails}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusIndicator;
