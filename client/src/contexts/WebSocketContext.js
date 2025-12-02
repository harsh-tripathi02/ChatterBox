import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WebSocketContext = createContext();

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messageHandlers = useRef(new Map());
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!token || !isAuthenticated) return;

    const websocket = new WebSocket(`ws://localhost:8000/ws/${token}`);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_status') {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            if (data.status === 'online') {
              newSet.add(data.user_id);
            } else {
              newSet.delete(data.user_id);
            }
            return newSet;
          });
        } else {
          // Call registered handlers
          messageHandlers.current.forEach((handler) => {
            handler(data);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setWs(null);
      
      // Attempt to reconnect after 3 seconds
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      reconnectTimeout.current = setTimeout(() => {
        if (token && isAuthenticated) {
          connect();
        }
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return websocket;
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && token) {
      const websocket = connect();
      
      return () => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
          websocket.close();
        }
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
      };
    }
  }, [isAuthenticated, token, connect]);

  const sendMessage = useCallback((message) => {
    if (ws && connected && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }, [ws, connected]);

  const registerHandler = useCallback((id, handler) => {
    messageHandlers.current.set(id, handler);
  }, []);

  const unregisterHandler = useCallback((id) => {
    messageHandlers.current.delete(id);
  }, []);

  const sendTypingIndicator = useCallback((recipientId, isTyping) => {
    sendMessage({
      type: 'typing',
      recipient_id: recipientId,
      is_typing: isTyping,
    });
  }, [sendMessage]);

  const value = {
    connected,
    sendMessage,
    registerHandler,
    unregisterHandler,
    onlineUsers,
    sendTypingIndicator,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};
