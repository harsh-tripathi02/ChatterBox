import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import './Sidebar.css';
import ProfileEditor from '../Profile/Profile';
import '../Profile/Profile.css';

function Sidebar({ friends, groups, selectedChat, onSelectChat, onRefresh }) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { onlineUsers } = useWebSocket();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('chats');
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/signin');
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const handleHomeSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        alert('Friend request sent');
        setSearchResults([]);
        setSearchQuery('');
      } else {
        const err = await response.json();
        alert(err.detail || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send friend request');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="user-info">
          <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
          <div className="user-details">
            <h3>{user?.username}</h3>
            <span className="user-status online">Online</span>
          </div>
        </div>
        
        <div className="sidebar-actions">
          <button className="icon-button" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="icon-button" onClick={handleSignOut} title="Sign out">
            🚪
          </button>
        </div>
      </div>

      <div className="sidebar-tabs">
        <button
          className={activeTab === 'chats' ? 'active' : ''}
          onClick={() => setActiveTab('chats')}
        >
          Chats
        </button>
        <button
          className={activeTab === 'friends' ? 'active' : ''}
          onClick={() => {
            setActiveTab('friends');
            navigate('/dashboard/friends');
          }}
        >
          Friends
        </button>
        <button
          className={activeTab === 'groups' ? 'active' : ''}
          onClick={() => {
            setActiveTab('groups');
            navigate('/dashboard/groups');
          }}
        >
          Groups
        </button>
        <div className="sidebar-search">
          <input
            type="text"
            placeholder="Search users to add..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleHomeSearch()}
          />
          <button onClick={handleHomeSearch} className="search-button">{searchLoading ? '...' : 'Search'}</button>
        </div>
      </div>

      {activeTab === 'chats' && (
        <div className="sidebar-content">
          <div className="chat-list">
            <h4>Friends</h4>
            {friends.length === 0 ? (
              <p className="empty-message">No friends yet</p>
            ) : (
              friends.map((friend) => (
                <div
                  key={friend.id}
                  className={`chat-item ${selectedChat?.id === friend.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectChat({ ...friend, type: 'user' });
                    navigate('/dashboard');
                  }}
                >
                  <div className="chat-avatar">{friend.username[0].toUpperCase()}</div>
                  <div className="chat-info">
                    <div className="chat-name">{friend.username}</div>
                    <div className={`chat-status ${isUserOnline(friend.id) ? 'online' : 'offline'}`}>
                      {isUserOnline(friend.id) ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>
              ))
            )}

            <h4 style={{ marginTop: '20px' }}>Groups</h4>
            {groups.length === 0 ? (
              <p className="empty-message">No groups yet</p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className={`chat-item ${selectedChat?.id === group.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectChat({ ...group, type: 'group' });
                    navigate('/dashboard');
                  }}
                >
                  <div className="chat-avatar group-avatar">👥</div>
                  <div className="chat-info">
                    <div className="chat-name">{group.name}</div>
                    <div className="chat-status">{group.members?.length || 0} members</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="search-results-dropdown">
          {searchResults.map((u) => (
            <div key={u.id} className="search-result-item">
              <div className="result-avatar">{u.username[0].toUpperCase()}</div>
              <div className="result-info">
                <div className="result-name">{u.username}</div>
                <div className="result-email">{u.email}</div>
              </div>
              <button className="btn-primary" onClick={() => handleSendRequest(u.id)}>Add</button>
            </div>
          ))}
        </div>
      )}

      {showProfile && (
        <div className="modal-overlay" onClick={() => setShowProfile(false)}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Profile</h3>
            <ProfileEditor user={user} onClose={() => { setShowProfile(false); onRefresh?.(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
