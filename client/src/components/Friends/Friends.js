import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Friends.css';

function Friends({ onRefresh }) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFriends();
    loadRequests();
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

  const loadRequests = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/friends/requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/users/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        alert('Friend request sent!');
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      alert('Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/friends/requests/${requestId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        loadRequests();
        loadFriends();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/friends/requests/${requestId}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        loadRequests();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;

    try {
      const response = await fetch(`http://localhost:8000/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        loadFriends();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  return (
    <div className="friends-container">
      <div className="friends-header">
        <h2>Friends</h2>
      </div>

      <div className="friends-tabs">
        <button
          className={activeTab === 'all' ? 'active' : ''}
          onClick={() => setActiveTab('all')}
        >
          All Friends ({friends.length})
        </button>
        <button
          className={activeTab === 'requests' ? 'active' : ''}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({requests.length})
        </button>
        <button
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
        >
          Add Friend
        </button>
      </div>

      <div className="friends-content">
        {activeTab === 'all' && (
          <div className="friends-list">
            {friends.length === 0 ? (
              <p className="empty-message">No friends yet. Add some friends to start chatting!</p>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="friend-item">
                  <div className="friend-avatar">{friend.username[0].toUpperCase()}</div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.username}</div>
                    <div className="friend-email">{friend.email}</div>
                  </div>
                  <button
                    className="btn-danger"
                    onClick={() => handleRemoveFriend(friend.id)}
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-list">
            {requests.length === 0 ? (
              <p className="empty-message">No pending friend requests</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="request-item">
                  <div className="friend-avatar">
                    {request.from_user.username[0].toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">{request.from_user.username}</div>
                    <div className="friend-email">{request.from_user.email}</div>
                  </div>
                  <div className="request-actions">
                    <button
                      className="btn-success"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="add-friend">
            <div className="search-box">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by username or email..."
              />
              <button onClick={handleSearch} disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((user) => (
                  <div key={user.id} className="friend-item">
                    <div className="friend-avatar">{user.username[0].toUpperCase()}</div>
                    <div className="friend-info">
                      <div className="friend-name">{user.username}</div>
                      <div className="friend-email">{user.email}</div>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleSendRequest(user.id)}
                    >
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Friends;
