import React, { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');
  const [socketConnected, setSocketConnected] = useState(false);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);

  const activeThreadIdRef = useRef(activeThreadId);

  // Keep ref up to date to prevent stale closures in event listeners
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

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

  // Fetch active conversations list
  const fetchThreads = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/facebook/threads', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setThreads(data);
      }
    } catch (err) {
      console.error('Error fetching threads list:', err);
    }
  }, [token]);

  // Fetch thread message history
  const fetchThreadHistory = useCallback(async (threadID) => {
    if (!token || !threadID) return;
    try {
      const response = await fetch(`/api/facebook/thread/${threadID}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (err) {
      console.error(`Error fetching history for thread ${threadID}:`, err);
    }
  }, [token]);

  // Refresh status and threads list
  const handleRefresh = useCallback(() => {
    fetchStatus();
    fetchThreads();
  }, [fetchStatus, fetchThreads]);

  // Login handler
  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setThreads([]);
    setActiveThreadId(null);
    setMessages([]);
    setServerStatus(null);
    setSocketConnected(false);
  };

  // Fetch thread history and clear unread badge when active thread changes
  useEffect(() => {
    if (activeThreadId) {
      fetchThreadHistory(activeThreadId);
      setThreads((prevThreads) =>
        prevThreads.map((t) =>
          t.threadID === activeThreadId ? { ...t, unreadCount: 0 } : t
        )
      );
    } else {
      setMessages([]);
    }
  }, [activeThreadId, fetchThreadHistory]);

  // Initialize Socket.io connection and status poll
  useEffect(() => {
    if (!token) return;

    // Fetch initial status and threads
    handleRefresh();

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

    // Listen to real-time message broadcasts from Facebook service
    socket.on('new_message', (payload) => {
      const { threadID, message, timestamp, senderName, isSelf } = payload;

      // 1. If it belongs to the currently active thread, append it to messages
      if (threadID === activeThreadIdRef.current) {
        setMessages((prev) => {
          // Avoid duplicate messages if socket broadcasts are repeated
          if (prev.some((m) => m.messageID === payload.messageID && payload.messageID)) {
            return prev;
          }
          return [
            ...prev,
            {
              messageID: payload.messageID,
              senderID: payload.senderID,
              senderName,
              message,
              timestamp,
              isSelf
            }
          ];
        });
      }

      // 2. Update the thread list snippet, timestamp, and position
      setThreads((prevThreads) => {
        const existingIndex = prevThreads.findIndex((t) => t.threadID === threadID);
        const updatedThreads = [...prevThreads];

        if (existingIndex > -1) {
          const existing = updatedThreads[existingIndex];
          const updated = {
            ...existing,
            snippet: message,
            timestamp,
            isSelfSnippet: isSelf,
            unreadCount: (threadID === activeThreadIdRef.current)
              ? 0
              : (isSelf ? existing.unreadCount : (existing.unreadCount || 0) + 1)
          };
          // Remove from old position and move to the top
          updatedThreads.splice(existingIndex, 1);
          updatedThreads.unshift(updated);
        } else {
          // Create a new thread entry at the top
          updatedThreads.unshift({
            threadID,
            name: senderName || 'Facebook User',
            unreadCount: (threadID === activeThreadIdRef.current || isSelf) ? 0 : 1,
            isGroup: false,
            snippet: message,
            isSelfSnippet: isSelf,
            timestamp
          });
        }
        return updatedThreads;
      });
    });

    return () => {
      clearInterval(pollInterval);
      socket.disconnect();
    };
  }, [token, handleRefresh]);

  return (
    <div className="app-container">
      {token ? (
        <Dashboard
          token={token}
          socketConnected={socketConnected}
          threads={threads}
          activeThreadId={activeThreadId}
          setActiveThreadId={setActiveThreadId}
          messages={messages}
          onLogout={handleLogout}
          serverStatus={serverStatus}
          fetchStatus={handleRefresh}
        />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
