import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './ChatView.css';

function ChatView({ chat, onStartCall }) {
  const { token, user } = useAuth();
  const { sendMessage, registerHandler, unregisterHandler, sendTypingIndicator } = useWebSocket();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (chat) {
      loadMessages();
      
      // Register WebSocket message handler
      const handlerId = `chat-${chat.id}`;
      registerHandler(handlerId, handleIncomingMessage);

      return () => {
        unregisterHandler(handlerId);
      };
    }
  }, [chat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const endpoint = chat.type === 'group'
        ? `http://localhost:8000/api/messages/group/${chat.id}`
        : `http://localhost:8000/api/messages/conversation/${chat.id}`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleIncomingMessage = (data) => {
    if (data.type === 'message') {
      if (
        (chat.type === 'user' && data.sender_id === chat.id) ||
        (chat.type === 'group' && data.group_id === chat.id)
      ) {
        setMessages(prev => [...prev, {
          id: data.message_id || Date.now().toString(),
          sender_id: data.sender_id,
          sender_username: data.sender_username,
          content: data.content,
          timestamp: data.timestamp,
          status: 'delivered'
        }]);

        // Send delivery status
        if (data.message_id) {
          sendMessage({
            type: 'status',
            recipient_id: data.sender_id,
            message_id: data.message_id,
            status: 'delivered'
          });
        }
      }
    } else if (data.type === 'typing' && data.user_id === chat.id) {
      setOtherUserTyping(data.is_typing);
    } else if (data.type === 'status') {
      setMessages(prev => prev.map(msg =>
        msg.id === data.message_id ? { ...msg, status: data.status } : msg
      ));
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageData = {
      content: inputValue,
      [chat.type === 'group' ? 'group_id' : 'recipient_id']: chat.id,
    };

    try {
      const response = await fetch('http://localhost:8000/api/messages/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add message to local state
        setMessages(prev => [...prev, data]);
        
        // Send via WebSocket for real-time delivery
        sendMessage({
          type: 'message',
          [chat.type === 'group' ? 'group_id' : 'recipient_id']: chat.id,
          content: inputValue,
          timestamp: data.timestamp,
          message_id: data.id,
        });

        setInputValue('');
        
        // Stop typing indicator
        if (chat.type === 'user') {
          sendTypingIndicator(chat.id, false);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    
    if (chat.type === 'user') {
      // Send typing indicator
      if (!isTyping) {
        setIsTyping(true);
        sendTypingIndicator(chat.id, true);
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTypingIndicator(chat.id, false);
      }, 2000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (status) => {
    switch (status) {
      case 'sent':
        return '✓';
      case 'delivered':
        return '✓✓';
      case 'read':
        return '✓✓';
      default:
        return '';
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {chat.type === 'group' ? '👥' : chat.username?.[0]?.toUpperCase()}
          </div>
          <div>
            <h3>{chat.name || chat.username}</h3>
            {otherUserTyping && <span className="typing-indicator">typing...</span>}
          </div>
        </div>
        
        {chat.type === 'user' && (
          <div className="chat-header-actions">
            <button
              className="icon-button"
              onClick={() => onStartCall(chat.id, false)}
              title="Audio call"
            >
              📞
            </button>
            <button
              className="icon-button"
              onClick={() => onStartCall(chat.id, true)}
              title="Video call"
            >
              📹
            </button>
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender_id === user.id ? 'sent' : 'received'}`}
          >
            {chat.type === 'group' && message.sender_id !== user.id && (
              <div className="message-sender">{message.sender_username}</div>
            )}
            <div className="message-bubble">
              <div className="message-content">{message.content}</div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.timestamp)}</span>
                {message.sender_id === user.id && (
                  <span className="message-status">{getMessageStatus(message.status)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input-container">
        <textarea
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows="1"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim()}
          className="send-button"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default ChatView;
