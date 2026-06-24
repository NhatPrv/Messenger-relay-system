import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);

  // Poll server status API
  const fetchStatus = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        // Token expired or invalid
        handleLogout();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data);
      }
    } catch (err) {
      console.error('Error fetching server status:', err);
    }
  }, [token]);

  // Login handler
  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setServerStatus(null);
    setSocketConnected(false);
  };

  // Clear messages handler
  const handleClearMessages = () => {
    setMessages([]);
  };

  // Initialize Socket.io connection and status poll
  useEffect(() => {
    if (!token) return;

    // Fetch initial status
    fetchStatus();

    // Setup periodic polling for metrics (every 5 seconds)
    const pollInterval = setInterval(fetchStatus, 5000);

    // Setup WebSocket connection
    const socketUrl = window.location.origin === 'http://localhost:3000' 
      ? 'http://localhost:5000' 
      : window.location.origin;

    const socket = io(socketUrl, {
      query: { token },
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('Successfully connected to WebSocket server.');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('Disconnected from WebSocket server.');
    });

    socket.on('connect_error', (err) => {
      setSocketConnected(false);
      console.error('WebSocket connection error:', err.message);
      if (err.message.includes('Authentication')) {
        handleLogout();
      }
    });

    // Listen to message broadcasts from Facebook service
    socket.on('new_message', (messagePayload) => {
      setMessages((prevMessages) => {
        // Cap list size at 100 to prevent performance degradation over time
        const newMsgs = [...prevMessages, messagePayload];
        if (newMsgs.length > 100) {
          newMsgs.shift();
        }
        return newMsgs;
      });
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [token, fetchStatus]);

  return (
    <div className="app-container">
      {token ? (
        <Dashboard
          token={token}
          socketConnected={socketConnected}
          messages={messages}
          onClearMessages={handleClearMessages}
          onLogout={handleLogout}
          serverStatus={serverStatus}
          fetchStatus={fetchStatus}
        />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
