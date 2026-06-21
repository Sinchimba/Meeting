# Database & Authentication Integration Guide

## Overview

The Smart Meeting Platform now includes:
- **MongoDB Database** for persistent data storage
- **User Authentication** with JWT tokens
- **Meeting Management** with full history
- **Protected Routes** for secure access

## Database Schema

### User Collection

```javascript
{
  _id: ObjectId,
  username: String (unique, required),
  email: String (unique, required),
  password: String (hashed, required),
  role: String ('normal' | 'sign'),
  displayName: String,
  avatar: String (URL),
  bio: String,
  isVerified: Boolean,
  preferences: {
    audioEnabled: Boolean,
    videoEnabled: Boolean,
    notificationsEnabled: Boolean
  },
  meetingsHosted: Number,
  meetingsAttended: Number,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Meeting Collection

```javascript
{
  _id: ObjectId,
  meetingId: String (unique, UUID),
  hostId: ObjectId (ref: User),
  hostName: String,
  title: String,
  description: String,
  participants: [
    {
      userId: ObjectId (ref: User),
      username: String,
      role: String,
      socketId: String,
      joinedAt: DateTime,
      leftAt: DateTime,
      duration: Number (seconds)
    }
  ],
  status: String ('scheduled' | 'ongoing' | 'completed' | 'cancelled'),
  scheduledFor: DateTime,
  startedAt: DateTime,
  endedAt: DateTime,
  duration: Number (seconds),
  recordingEnabled: Boolean,
  recordingUrl: String,
  settings: {
    requirePassword: Boolean,
    password: String,
    allowChat: Boolean,
    allowScreenShare: Boolean,
    allowRecording: Boolean
  },
  createdAt: DateTime,
  updatedAt: DateTime
}
```

### Message Collection

```javascript
{
  _id: ObjectId,
  meetingId: String (indexed),
  userId: ObjectId (ref: User),
  username: String,
  userRole: String ('normal' | 'sign'),
  message: String (max 5000 chars),
  type: String ('text' | 'system' | 'translation'),
  translation: {
    original: String,
    language: String,
    translatedText: String
  },
  reactions: [
    {
      emoji: String,
      userId: ObjectId
    }
  ],
  isEdited: Boolean,
  editedAt: DateTime,
  isDeleted: Boolean,
  createdAt: DateTime (indexed)
}
```

## Authentication Flow

### Registration

```
User fills registration form
   ↓
POST /api/auth/register
  - Validate input
  - Check username/email not taken
  - Hash password
  - Create user in MongoDB
  - Generate JWT token
   ↓
Return token & user info
   ↓
Store in localStorage
   ↓
Redirect to home
```

### Login

```
User enters credentials
   ↓
POST /api/auth/login
  - Find user by email
  - Compare passwords
  - Generate JWT token
   ↓
Return token & user info
   ↓
Store in localStorage
   ↓
Redirect to home
```

### Protected Routes

```
Frontend
  ↓
Check localStorage for token
  ↓
Token exists?
  ├─ Yes: Allow access
  └─ No: Redirect to login

API Requests
  ↓
Add token to Authorization header
  ↓
Backend receives request
  ↓
Middleware verifies token
  ↓
Token valid?
  ├─ Yes: Process request, attach user info
  └─ No: Return 401 Unauthorized
```

### WebSocket Authentication

```
Frontend
  ↓
Connect to Socket.IO with token in auth
  ↓
io(BACKEND_URL, {
  auth: { token }
})

Backend
  ↓
io.use(socketAuthenticate)
  ↓
Verify token
  ↓
Attach user to socket
  ↓
Allow connection
```

## API Endpoints

### Authentication

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "normal"
}

Response:
{
  "message": "User registered successfully",
  "user": {
    "id": "...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "normal"
  },
  "token": "eyJhbGc..."
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword"
}

Response:
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGc..."
}
```

#### Get Profile
```
GET /api/auth/profile
Authorization: Bearer {token}

Response:
{
  "user": {
    "id": "...",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "normal",
    "displayName": "John Doe",
    "avatar": "...",
    "preferences": { ... },
    "meetingsHosted": 5,
    "meetingsAttended": 12
  }
}
```

### Meetings

#### Create Meeting
```
POST /api/meetings
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Project Discussion",
  "description": "Discussing Q2 roadmap",
  "role": "normal"
}

Response:
{
  "message": "Meeting created successfully",
  "meeting": {
    "meetingId": "...",
    "id": "...",
    "title": "Project Discussion",
    "hostName": "john_doe",
    "status": "scheduled"
  }
}
```

#### Get User Meetings
```
GET /api/meetings/user-meetings?status=ongoing
Authorization: Bearer {token}

Response:
{
  "meetings": [
    {
      "meetingId": "...",
      "title": "...",
      "status": "ongoing",
      "participants": [...],
      ...
    }
  ]
}
```

#### Start Meeting
```
PUT /api/meetings/{meetingId}/start
Authorization: Bearer {token}

Response:
{
  "message": "Meeting started",
  "meeting": { ... }
}
```

#### End Meeting
```
PUT /api/meetings/{meetingId}/end
Authorization: Bearer {token}

Response:
{
  "message": "Meeting ended",
  "meeting": { ... }
}
```

## Frontend Integration

### Storing Token

```javascript
// After successful login/registration
localStorage.setItem('token', response.data.token)
localStorage.setItem('user', JSON.stringify(response.data.user))
```

### Using Token in API Calls

```javascript
import axios from 'axios'

const token = localStorage.getItem('token')

const response = await axios.post(
  'http://localhost:3000/api/meetings',
  { title: 'Meeting' },
  {
    headers: {
      Authorization: `Bearer ${token}`
    }
  }
)
```

### Using Token with Socket.IO

```javascript
const token = localStorage.getItem('token')

const socket = io(BACKEND_URL, {
  auth: {
    token
  }
})
```

### Protected Routes

```javascript
function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return children
}
```

## Backend Implementation

### Models (MongoDB)

Files:
- `backend/src/models/User.js`
- `backend/src/models/Meeting.js`
- `backend/src/models/Message.js`

Features:
- Automatic timestamps (createdAt, updatedAt)
- Password hashing with bcryptjs
- Unique constraints
- Indexes for performance
- Data validation

### Authentication Middleware

File: `backend/src/middleware/auth.js`

Functions:
- `authenticate` - Verify JWT and attach user to request
- `generateToken` - Create JWT token
- `socketAuthenticate` - Verify JWT for WebSocket connections

### Services

Files:
- `backend/src/services/userService.js`
- `backend/src/services/meetingService.js`

Features:
- User registration, login, profile management
- Meeting creation, participant management
- Statistics and analytics

### Controllers

Files:
- `backend/src/controllers/authController.js`
- `backend/src/controllers/meetingController.js`

Features:
- Request validation
- Error handling
- Response formatting

### Routes

Files:
- `backend/src/routes/auth.js`
- `backend/src/routes/meetings.js`

Features:
- Public routes (registration, login)
- Protected routes (profile, meetings)
- Error handling

## Security Considerations

### Current Implementation
✅ Password hashing with bcryptjs (salt rounds: 10)
✅ JWT token-based authentication
✅ Token expiration (7 days)
✅ HTTPS-ready (use HTTPS in production)
✅ CORS configured
✅ Input validation on backend
✅ Protected API endpoints

### Recommended for Production
- [ ] Rate limiting on auth endpoints
- [ ] Email verification
- [ ] Password reset functionality
- [ ] Refresh tokens
- [ ] Two-factor authentication
- [ ] Account lockout after failed attempts
- [ ] Audit logging
- [ ] API key validation
- [ ] HTTPS enforcement
- [ ] CORS restrictions

## Environment Setup

### Backend .env

```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/smart-meeting
FRONTEND_URL=http://localhost:5173
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### Frontend .env

```
VITE_BACKEND_URL=http://localhost:3000
```

## Database Connection

### Local MongoDB

```bash
# Install MongoDB
brew install mongodb-community  # macOS
# or
sudo apt-get install mongodb    # Linux

# Start MongoDB
mongod

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in backend/.env
```

## Testing

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "normal"
  }'
```

### Login User

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Create Meeting

```bash
curl -X POST http://localhost:3000/api/meetings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Meeting",
    "role": "normal"
  }'
```

## Troubleshooting

### MongoDB Connection Error
```
Check MongoDB is running: mongod
Check connection string in .env
Verify MongoDB is accessible
```

### Token Invalid Error
```
Ensure token is in Authorization header
Format: "Bearer {token}"
Token hasn't expired
```

### CORS Error
```
Check FRONTEND_URL in backend/.env
Ensure port is correct
Clear browser cache
```

### Socket.IO Connection Failed
```
Ensure token is passed in auth
Check Socket.IO middleware is configured
Verify token is valid
Check server logs for errors
```

## Performance Optimization

### Database Indexes
- User: username, email
- Meeting: meetingId, hostId, status
- Message: meetingId, createdAt

### Caching (Future)
- User preferences in memory
- Meeting participant lists
- Recent messages

### Pagination (Future)
- Limit meetings to 20 per request
- Limit messages to 50 per request
- Implement cursor-based pagination

---

**Last Updated:** April 27, 2026
**Version:** 1.0 (Authentication & Database Integration)
