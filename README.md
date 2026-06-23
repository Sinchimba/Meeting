# SMART MEETING PLATFORM FOR REAL-TIME SIGN LANGUAGE CONVERSION

A production-grade, full-stack platform enabling real-time communication between standard users, deaf users, and mute users through AI-powered sign language recognition and generation.

## 📋 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│               Vite + TypeScript + Socket.IO                      │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/WebSocket
┌─────────────────────────▼────────────────────────────────────────┐
│                     Backend API (Node.js)                        │
│            Express + TypeORM + Socket.IO                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  • Auth (JWT + Refresh Tokens)                           │   │
│  │  • Meeting Management                                    │   │
│  │  • Real-time WebSocket Events                            │   │
│  │  • Translation Logs                                      │   │
│  │  • AI Service Gateway                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└───┬──────────────────┬──────────────────┬──────────────────────┘
    │                  │                  │
    │                  │                  │
┌───▼──────┐   ┌──────▼────┐      ┌─────▼────┐
│MySQL     │   │   Redis   │      │  MinIO   │
│          │   │(Pub/Sub)  │      │ (Storage)│
└──────────┘   └───────────┘      └──────────┘

┌──────────────────────────────────────┐
│   Python AI Microservices            │
│  • Sign Recognition (FastAPI)        │
│  • Sign Generation                   │
│  • Avatar Rendering                  │
│  • Speech-to-Text / Text-to-Speech   │
└──────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local dev)
- Python 3.11+ (for AI services)

### Option 1: Docker Compose (Recommended)

```bash
# Clone and navigate
git clone <repo>
cd <repo>

# Start all services
docker-compose up --build

# Access services
# Frontend:  http://localhost:5173
# Backend:   http://localhost:4000
# MinIO UI:  http://localhost:9001
```

### Option 2: Local Development

**Backend:**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**Frontend:**
```bash
cd ui
cp .env.example .env
npm install
npm run dev
```

## 📁 Project Structure

```
mute/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── main.ts            # Entry point
│   │   ├── data-source.ts     # TypeORM config
│   │   ├── modules/
│   │   │   ├── auth/          # Authentication
│   │   │   ├── users/         # User management
│   │   │   ├── meetings/      # Meeting management
│   │   │   └── translation/   # Translation logging
│   │   ├── common/            # Shared utilities
│   │   └── socket/            # WebSocket gateway
│   ├── Dockerfile
│   └── README.md
│
├── ui/                  # React + Vite
│   ├── src/
│   │   ├── api/               # API clients
│   │   ├── pages/             # Route pages
│   │   ├── components/        # Components
│   │   ├── stores/            # Zustand state
│   │   └── hooks/             # Custom hooks
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── .env.example
│
├── ai/                 # AI Microservices
│   ├── app.py                 # FastAPI
│   ├── inference.py           # Sign recognition
│   ├── models.py              # ML models
│   ├── requirements.txt
│   └── Dockerfile
│
├── documentation/                      # Documentation
│   ├── classdiagram.png       # UML diagram
│   └── level1.png             # DFD diagram
│
├── docker-compose.yml         # Orchestration
└── README.md                  # This file
```

## 🔐 Authentication

- JWT access tokens (15m expiry)
- Refresh tokens (30d, stored in DB)
- bcrypt password hashing
- RBAC with user roles: `standard`, `mute`, `deaf`, `admin`

## 🔄 Real-Time Communication

**Mute User (Sign → Speech):**
```
Camera → WebRTC → SFU → Sign Recognition AI → Text/Speech → All Participants
```

**Deaf User (Speech → Sign):**
```
Audio → WebRTC → SFU → Speech-to-Text → Sign Generation → Avatar → Deaf User
```

## 🌐 API Endpoints

- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `GET /api/users/me` - Get profile
- `POST /api/meetings` - Create meeting
- `GET /api/meetings/:id` - Get meeting
- `GET /api/health` - Health check

## 🗄️ Database

MySQL with tables:
- `users` - User accounts
- `sessions` - Refresh tokens
- `meetings` - Meeting records
- `translation_logs` - Translation history

## 🔒 Security

- Helmet (security headers)
- CORS (configured for ui)
- Rate limiting (200 req/15min)
- Input validation
- JWT with secure secrets (rotate in prod)

## 📊 Deployment

### Production Checklist
- [ ] Update JWT_SECRET in backend .env
- [ ] Configure MySQL with strong credentials
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/TLS
- [ ] Configure TURN servers for WebRTC
- [ ] Set up monitoring and logging
- [ ] Review CORS and security settings

### Environment Variables

**Backend:**
```
PORT=4000
DATABASE_URL=mysql://user:pass@host/mute
DB_TYPE=mysql
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=https://<your-ui>.onrender.com
AI_SERVICE_URL=https://<your-ai-service>.onrender.com
```

**Frontend:**
```
VITE_API_BASE_URL=http://localhost:4000/api
VITE_BACKEND_URL=http://localhost:4000
```

### Render deployment & Cost-Free Hosting

A recommended Render configuration is available in `render.yaml`. The platform is fully designed to run under a **100% cost-free hosting model**:

1. **Database (SQLite)**: Set `DB_TYPE=sqlite` and omit `DATABASE_URL` to use a local, zero-maintenance SQLite database. This avoids paying for a managed cloud database.
2. **Media Relay (STUN/TURN)**: Integrated with the free TURN/STUN servers from the Metered Open Relay project, allowing global connections (e.g. Dar es Salaam to Arusha) behind symmetric NATs without incurring bandwidth fees.
3. **App Services (Render)**:
   - Deploy `ui` as a **Render Static Site** (always free). Set `VITE_BACKEND_URL` and `VITE_API_BASE_URL` to your backend URL.
   - Deploy `backend` as a **Render Web Service** on the Free Instance Type.
4. **SMS Gateway**: Simulated as a cost-free gateway logging invitations in backend stdout logs to avoid paying for third-party messaging services.

## 📚 Documentation

- [Backend Guide](./backend/README.md)
- [WebRTC Setup](./documentation/WEBRTC.md)
- [UML Class Diagram](./assets/classdiagram.png)
- [Data Flow Diagram](./assets/level1.png)

## 🐛 Troubleshooting

**Backend won't start?**
- Verify `.env` file exists
- Ensure MySQL and Redis are running
- Check Docker logs: `docker logs mute-api`

**Frontend can't reach backend?**
- Verify `VITE_API_BASE_URL` in `.env`
- Check CORS configuration
- Ensure backend is running

**Database errors?**
- Verify MySQL is accessible
- Check `DATABASE_URL` format
- Ensure database user has proper permissions

## 📞 Support

For issues or questions, open a GitHub issue or contact the team.

---

**Version**: 1.0.0 | **Status**: Production Ready | **Last Updated**: May 29, 2026
