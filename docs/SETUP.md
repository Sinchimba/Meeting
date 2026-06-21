# Frontend

## Project Structure
```
frontend/
├── src/
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── stores/         # State management (Zustand)
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── vite.config.js      # Vite configuration
└── package.json        # Dependencies and scripts
```

## Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173

# Backend

## Project Structure
```
backend/
├── src/
│   ├── routes/         # API route handlers
│   ├── models/         # MongoDB schemas
│   ├── controllers/    # Business logic
│   ├── middleware/     # Express middleware
│   ├── services/       # Reusable services
│   └── index.js        # Server entry point
├── .env                # Environment variables
└── package.json        # Dependencies and scripts
```

## Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on http://localhost:3000

## Key Features Implemented

### Backend
- Express server with Socket.IO for real-time communication
- Meeting management with unique IDs
- Participant tracking and role management
- WebSocket events for joining/leaving meetings
- Chat messaging functionality

### Frontend
- React with Vite for fast development
- Meeting creation and joining
- User role selection (Normal or Sign Language user)
- Participant list display
- Basic chat functionality
- Socket.IO integration for real-time updates

## Next Steps

1. Implement WebRTC for video/audio streaming
2. Add speech-to-text for normal users
3. Add sign recognition functionality
4. Implement video recording and playback
5. Add database models for users and meeting history
6. Implement authentication and authorization
7. Add user profiles and preferences
8. Implement sign language translation
