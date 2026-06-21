# Quick Setup Guide

## 🚀 Start in 2 Minutes

### Option 1: Docker Compose (Easiest)

```bash
# Navigate to project root
cd /path/to/mute

# Copy env files from examples
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose up --build

# Wait 30-60 seconds for all services to be ready
# Then access:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:4000
# MinIO:     http://localhost:9001 (creds: minioadmin/minioadmin)
```

### Option 2: Local Development (With Docker for DB)

**Terminal 1 - Start Backend Dependencies:**
```bash
cd /path/to/mute/backend
docker-compose up -d  # Start MySQL, redis, minio
cp .env.example .env
npm install
npm run dev
# Backend runs on http://localhost:4000
```

**Terminal 2 - Start Frontend:**
```bash
cd /path/to/mute/frontend
cp .env.example .env
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

**Terminal 3 (Optional) - Start AI Service:**
```bash
cd /path/to/mute/python-ai
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python app.py
# AI runs on http://localhost:5000
```

## 🧪 Test the Integration

### 1. Check Backend Health
```bash
curl http://localhost:4000/api/health
# Expected response: { "status": "ok" }
```

### 2. Register a User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "role": "standard"
  }'
# Expected: { "user": {...}, "accessToken": "..." }
```

### 3. Get Current User Profile
```bash
# Replace TOKEN with the accessToken from above
curl http://localhost:4000/api/users/me \
  -H "Authorization: Bearer TOKEN"
# Expected: { "id": "...", "name": "...", "email": "...", "role": "standard" }
```

### 4. Create a Meeting
```bash
curl -X POST http://localhost:4000/api/meetings \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "title": "Test Meeting" }'
# Expected: { "id": "...", "title": "Test Meeting", "status": "active", ... }
```

### 5. Access Frontend
- Open http://localhost:5173 in your browser
- Click "Register" 
- Create an account (any email/password)
- Dashboard should load

## 🐛 Troubleshooting

### "Cannot connect to backend"
- Backend running? Check: `docker ps` or `ps aux | grep node`
- CORS issue? Check backend/src/main.ts for cors config
- Wrong URL? Verify `VITE_API_BASE_URL` in frontend/.env

### "Database connection failed"
- MySQL running? `docker ps | grep mysql`
- Check database URL: should be `mysql://mute:mute@mysql:3306/mute`
- For local: `mysql://localhost:3307/mute`

### "Port already in use"
```bash
# Kill process using port 4000 (backend)
lsof -ti:4000 | xargs kill -9

# Kill process using port 5173 (frontend)
lsof -ti:5173 | xargs kill -9

# Kill process using port 3307 (mysql)
lsof -ti:5432 | xargs kill -9
```

### "Docker compose not found"
- Ensure Docker Desktop is running
- On Linux: `sudo apt-get install docker-compose`
- On Mac: Install Docker Desktop

## 📝 Project Structure After Setup

```
✓ backend/src/          - Modular, clean TypeScript code
✓ frontend/src/         - React components, API clients, stores
✓ python-ai/            - ML models and inference
✓ docs/                 - Architecture diagrams and guides
✓ docker-compose.yml    - Full orchestration
✓ README.md             - Main documentation
```

## 🎯 Next Steps

1. **Explore the code**: Check out `backend/src/modules` for architecture patterns
2. **Connect to UI**: Frontend at http://localhost:5173 should auto-connect to backend
3. **Test real-time**: Open two browser tabs and chat via WebSocket
4. **Integrate AI**: Once AI service is running, Sign Recognition will activate
5. **Deploy**: Use docker-compose.yml as base for Kubernetes deployment

## 📚 Key Files to Understand

- **Backend Entry**: `backend/src/main.ts`
- **Database**: `backend/src/data-source.ts`
- **Auth**: `backend/src/modules/auth/`
- **Frontend API Client**: `frontend/src/api/client.ts`
- **WebSocket Client**: `frontend/src/api/socket.ts`
- **Auth State**: `frontend/src/stores/authStore.ts`

## ✅ Success Indicators

After setup, you should see:
- ✓ Backend API responding at http://localhost:4000/api/health
- ✓ Frontend loading at http://localhost:5173
- ✓ Can register/login successfully
- ✓ Can create meetings
- ✓ WebSocket connects (check browser DevTools Network tab)
- ✓ Database populated with test data

## 🚀 Ready to Code!

Start by:
1. Modifying components in `frontend/src/components/`
2. Adding API endpoints in `backend/src/modules/`
3. Running tests: `npm run test:backend`
4. Building: `npm run build`

For detailed info, see [README.md](./README.md) and service READMEs.
