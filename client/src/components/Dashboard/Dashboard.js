import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import ChatView from '../Chat/ChatView';
import Friends from '../Friends/Friends';
import Groups from '../Groups/Groups';
import VideoCall from '../Call/VideoCall';
import './Dashboard.css';

function Dashboard() {
  const { token } = useAuth();
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/friends/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/groups/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setActiveCall(null);
  };

  const handleStartCall = (recipientId, isVideo) => {
    setActiveCall({ recipientId, isVideo });
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  return (
    <div className="dashboard">
      <Sidebar
        friends={friends}
        groups={groups}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        onRefresh={() => {
          loadFriends();
          loadGroups();
        }}
      />
      
      <div className="dashboard-content">
        {activeCall ? (
          <VideoCall
            recipientId={activeCall.recipientId}
            isVideo={activeCall.isVideo}
            onEndCall={handleEndCall}
          />
        ) : (
          <Routes>
            <Route
              path="/"
              element={
                selectedChat ? (
                  <ChatView
                    chat={selectedChat}
                    onStartCall={handleStartCall}
                  />
                ) : (
                  <div className="no-chat-selected">
                    <h2>Welcome to ChatterBox</h2>
                    <p>Select a conversation to start chatting</p>
                  </div>
                )
              }
            />
            <Route
              path="/friends"
              element={<Friends onRefresh={loadFriends} />}
            />
            <Route
              path="/groups"
              element={<Groups onRefresh={loadGroups} />}
            />
          </Routes>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
