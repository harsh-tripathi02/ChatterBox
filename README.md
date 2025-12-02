# ChatterBox

A full-featured real-time chat application with audio/video calling capabilities.

## Features

- **Authentication**: Secure signup and signin with JWT-based authentication
- **Friend Management**: Search users, send/accept/reject friend requests, remove friends
- **One-to-One Chat**: Real-time messaging with delivery status (sent, delivered, read) and typing indicators
- **Group Chat**: Create groups, add/remove members, rename groups, group messaging
- **Audio & Video Calls**: WebRTC-based one-to-one audio and video calling with signaling
- **Real-time Updates**: WebSocket connections for instant messaging and presence
- **Theme Switcher**: Dark and light mode with custom color palette (black, red, yellow, blue)
- **Responsive Design**: Clean, modern UI that works across different screen sizes

## Tech Stack

- **Frontend**: React (JavaScript, no TypeScript)
- **Backend**: FastAPI + uvicorn
- **Database**: MongoDB Atlas
- **Real-time**: WebSockets (for messaging, signaling, presence)
- **Media**: WebRTC (for audio/video streams)

## Project Structure

```
ChatterBox/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   │   ├── Auth/      # Authentication components
│   │   │   ├── Call/      # Video/audio call components
│   │   │   ├── Chat/      # Chat view components
│   │   │   ├── Dashboard/ # Main dashboard and sidebar
│   │   │   ├── Friends/   # Friend management
│   │   │   └── Groups/    # Group management
│   │   ├── contexts/      # React contexts (Auth, Theme, WebSocket)
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── server/                # FastAPI backend
│   ├── routes/            # API route handlers
│   │   ├── auth.py       # Authentication routes
│   │   ├── friends.py    # Friend management routes
│   │   ├── groups.py     # Group management routes
│   │   ├── messages.py   # Messaging routes
│   │   └── users.py      # User routes
│   ├── main.py           # FastAPI app and WebSocket handler
│   ├── database.py       # MongoDB connection
│   ├── models.py         # Pydantic models
│   ├── auth_utils.py     # Authentication utilities
│   ├── websocket_manager.py  # WebSocket connection manager
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variables template
├── .gitignore
└── README.md
```

## Step-by-Step Setup and Run Guide

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v16 or higher) and npm - [Download](https://nodejs.org/)
- **Python** (3.9 or higher) - [Download](https://www.python.org/downloads/)
- **MongoDB Atlas account** - [Sign up](https://www.mongodb.com/cloud/atlas/register)

### Step 1: Clone or Download the Repository

```bash
# If using git
git clone <repository-url>
cd ChatterBox

# Or download and extract the ZIP file, then navigate to the folder
```

### Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in
2. Create a new cluster (free tier is sufficient)
3. Click "Connect" on your cluster
4. Choose "Connect your application"
5. Copy the connection string (it should look like: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)
6. Create a database user with a password
7. Whitelist your IP address (or use 0.0.0.0/0 for development to allow all IPs)

### Step 3: Set Up the Backend

1. Navigate to the server directory:
```bash
cd server
```

2. Create a Python virtual environment:
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the `server` directory:
```bash
# On Windows
copy .env.example .env

# On macOS/Linux
cp .env.example .env
```

5. Edit the `.env` file and add your configuration:
```env
MONGODB_URL=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/?retryWrites=true&w=majority
DATABASE_NAME=chatterbox
SECRET_KEY=your-secret-key-here-at-least-32-characters-long-for-security
```

**Important**: Replace the placeholders with your actual values:
- `your-username`: Your MongoDB Atlas username
- `your-password`: Your MongoDB Atlas password
- `your-cluster`: Your MongoDB Atlas cluster name
- `SECRET_KEY`: Generate a secure random string (at least 32 characters)

To generate a secure secret key, you can use:
```bash
# On Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})

# On macOS/Linux
openssl rand -hex 32
```

6. Start the backend server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend should now be running at `http://localhost:8000`

### Step 4: Set Up the Frontend

1. Open a new terminal window and navigate to the client directory:
```bash
cd client
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend should now be running at `http://localhost:3000` and should automatically open in your browser.

### Step 5: Using the Application

1. **Sign Up**: Create a new account with a username, email, and password (minimum 6 characters)
2. **Sign In**: Log in with your credentials
3. **Add Friends**: 
   - Go to the Friends tab
   - Click "Add Friend"
   - Search for users by username or email
   - Send friend requests
4. **Accept Friend Requests**: Check the "Requests" tab to accept or reject incoming requests
5. **Start Chatting**: Select a friend from the sidebar to start a one-to-one chat
6. **Create Groups**: 
   - Go to the Groups tab
   - Click "Create Group"
   - Add members from your friends list
7. **Audio/Video Calls**: In a one-to-one chat, click the phone (📞) or video (📹) icon to start a call
8. **Switch Theme**: Click the theme toggle button (🌙/☀️) in the header to switch between dark and light modes

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create a new account
- `POST /api/auth/signin` - Sign in to existing account

### Users
- `GET /api/users/me` - Get current user info
- `GET /api/users/search?q=query` - Search users
- `GET /api/users/{user_id}` - Get user by ID

### Friends
- `GET /api/friends/` - Get all friends
- `GET /api/friends/requests` - Get pending friend requests
- `POST /api/friends/request/{user_id}` - Send friend request
- `POST /api/friends/requests/{request_id}/accept` - Accept friend request
- `POST /api/friends/requests/{request_id}/reject` - Reject friend request
- `DELETE /api/friends/{friend_id}` - Remove friend

### Messages
- `POST /api/messages/` - Send a message
- `GET /api/messages/conversation/{user_id}` - Get conversation with user
- `GET /api/messages/group/{group_id}` - Get group messages
- `PUT /api/messages/{message_id}/status` - Update message status

### Groups
- `GET /api/groups/` - Get user's groups
- `POST /api/groups/` - Create a new group
- `GET /api/groups/{group_id}` - Get group details
- `PUT /api/groups/{group_id}/name` - Rename group
- `POST /api/groups/{group_id}/members/{user_id}` - Add member to group
- `DELETE /api/groups/{group_id}/members/{user_id}` - Remove member from group

### WebSocket
- `WS /ws/{token}` - WebSocket connection for real-time messaging and signaling

## WebSocket Message Types

- `message` - Chat message
- `typing` - Typing indicator
- `status` - Message delivery status update
- `user_status` - User online/offline status
- `offer` - WebRTC offer (call initiation)
- `answer` - WebRTC answer (call acceptance)
- `ice-candidate` - WebRTC ICE candidate (connection establishment)
- `call-end` - Call termination signal

## Security Notes

- Passwords are hashed using bcrypt before storage
- JWT tokens are used for authentication
- All API endpoints (except auth) require valid authentication
- WebSocket connections require valid JWT tokens
- Never commit the `.env` file or expose your MongoDB credentials
- Use strong, unique passwords for MongoDB Atlas
- In production, use HTTPS/WSS instead of HTTP/WS

## Troubleshooting

### Backend Issues

**Issue**: Cannot connect to MongoDB
- Verify your MongoDB connection string in `.env`
- Check that your IP is whitelisted in MongoDB Atlas
- Ensure your database user has the correct permissions

**Issue**: Port 8000 already in use
```bash
# Change the port in the uvicorn command
uvicorn main:app --reload --host 0.0.0.0 --port 8001
# Update the frontend API calls to use the new port
```

### Frontend Issues

**Issue**: Cannot connect to backend
- Ensure the backend is running on `http://localhost:8000`
- Check browser console for CORS errors
- Verify the API URL in the frontend code matches the backend URL

**Issue**: WebSocket connection fails
- Check that the backend WebSocket endpoint is accessible
- Verify your JWT token is valid
- Check browser console for WebSocket errors

**Issue**: Camera/microphone not working
- Grant browser permissions for camera and microphone
- Check that your devices are not being used by another application
- Try using HTTPS (some browsers require secure context for WebRTC)

### General Issues

**Issue**: Dependencies fail to install
```bash
# Backend
pip install --upgrade pip
pip install -r requirements.txt

# Frontend
npm cache clean --force
npm install
```

## Development Tips

- The backend auto-reloads on code changes (thanks to `--reload` flag)
- The frontend auto-reloads on code changes (React's hot reload)
- Check browser console for frontend errors
- Check terminal for backend errors
- Use MongoDB Compass to inspect database contents

## Browser Compatibility

- Chrome/Edge (recommended for best WebRTC support)
- Firefox
- Safari (may have limited WebRTC features)

## Known Limitations

- WebRTC requires STUN/TURN servers for connections across different networks
- Currently uses public STUN servers (Google's); for production, consider setting up your own TURN server
- Group video calls are not implemented (only one-to-one)
- File sharing is not implemented
- Message editing/deletion is not implemented

## Future Enhancements

- Message encryption
- File and image sharing
- Voice messages
- Group video calls
- Push notifications
- Message search
- User profiles with avatars
- Read receipts with timestamps
- Message reactions

## License

This project is provided as-is for educational purposes.

## Support

For issues and questions, please check:
1. This README's troubleshooting section
2. Browser console for error messages
3. Backend terminal for server errors
4. MongoDB Atlas logs for database issues
