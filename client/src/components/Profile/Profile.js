import React, { useState } from 'react';
import './Profile.css';

function ProfileEditor({ user, onClose }) {
  const [username, setUsername] = useState(user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [preview, setPreview] = useState(user?.avatar || null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const body = { username };
      if (avatar) body.avatar = avatar;

      const res = await fetch('http://localhost:8000/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        localStorage.setItem('user', JSON.stringify(updated));
        alert('Profile updated');
        onClose && onClose();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update profile');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-editor">
      <div className="profile-row">
        <label>Avatar</label>
        <div className="avatar-preview">
          {preview ? <img src={preview} alt="avatar" /> : <div className="avatar-placeholder">{username?.[0]?.toUpperCase()}</div>}
        </div>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <div className="profile-row">
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>

      <div className="profile-actions">
        <button className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn-primary" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
      </div>
    </div>
  );
}

export default ProfileEditor;
