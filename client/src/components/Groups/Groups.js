import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Groups.css';

function Groups({ onRefresh }) {
  const { token } = useAuth();
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  useEffect(() => {
    loadGroups();
    loadFriends();
  }, []);

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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/groups/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newGroupName,
          members: selectedMembers,
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setNewGroupName('');
        setSelectedMembers([]);
        loadGroups();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  const handleRenameGroup = async (groupId) => {
    const newName = prompt('Enter new group name:');
    if (!newName || !newName.trim()) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/groups/${groupId}/name?new_name=${encodeURIComponent(newName)}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        loadGroups();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error renaming group:', error);
      alert('Failed to rename group');
    }
  };

  const handleAddMember = async (groupId, userId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/groups/${groupId}/members/${userId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        loadGroups();
        setShowAddMemberModal(false);
        setSelectedGroup(null);
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId, userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/groups/${groupId}/members/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        loadGroups();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <div className="groups-container">
      <div className="groups-header">
        <h2>Groups</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          Create Group
        </button>
      </div>

      <div className="groups-content">
        {groups.length === 0 ? (
          <p className="empty-message">No groups yet. Create a group to start!</p>
        ) : (
          <div className="groups-list">
            {groups.map((group) => (
              <div key={group.id} className="group-card">
                <div className="group-header">
                  <div className="group-avatar">👥</div>
                  <div className="group-info">
                    <h3>{group.name}</h3>
                    <p>{group.members.length} members</p>
                  </div>
                  <div className="group-actions">
                    <button
                      className="icon-button"
                      onClick={() => handleRenameGroup(group.id)}
                      title="Rename group"
                    >
                      ✏️
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowAddMemberModal(true);
                      }}
                      title="Add member"
                    >
                      ➕
                    </button>
                  </div>
                </div>

                <div className="group-members">
                  <h4>Members:</h4>
                  <div className="members-list">
                    {group.members.map((member) => (
                      <div key={member.id} className="member-item">
                        <div className="member-avatar">
                          {member.username[0].toUpperCase()}
                        </div>
                        <span>{member.username}</span>
                        <button
                          className="remove-button"
                          onClick={() => handleRemoveMember(group.id, member.id)}
                          title="Remove member"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create New Group</h3>
            
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            </div>

            <div className="form-group">
              <label>Add Members</label>
              <div className="members-selection">
                {friends.map((friend) => (
                  <div key={friend.id} className="member-checkbox">
                    <input
                      type="checkbox"
                      id={`friend-${friend.id}`}
                      checked={selectedMembers.includes(friend.id)}
                      onChange={() => toggleMemberSelection(friend.id)}
                    />
                    <label htmlFor={`friend-${friend.id}`}>{friend.username}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateGroup}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMemberModal && selectedGroup && (
        <div className="modal-overlay" onClick={() => setShowAddMemberModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Member to {selectedGroup.name}</h3>
            
            <div className="members-selection">
              {friends
                .filter(friend => !selectedGroup.members.some(m => m.id === friend.id))
                .map((friend) => (
                  <div key={friend.id} className="friend-item">
                    <div className="friend-avatar">{friend.username[0].toUpperCase()}</div>
                    <div className="friend-info">
                      <div className="friend-name">{friend.username}</div>
                    </div>
                    <button
                      className="btn-primary"
                      onClick={() => handleAddMember(selectedGroup.id, friend.id)}
                    >
                      Add
                    </button>
                  </div>
                ))}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddMemberModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Groups;
