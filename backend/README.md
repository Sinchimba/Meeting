# Mute Backend

Development scaffold for the SMART MEETING PLATFORM backend.

Quick start (local):

1. Copy env file:

```bash
cd backend
cp .env.example .env
```

2. Start services with Docker Compose:

```bash
docker-compose up --build
```

3. Or run locally:

```bash
npm ci
npm run dev
```

Endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me` (requires `Authorization: Bearer <token>`)

Notes:
- This scaffold uses TypeORM with `synchronize: true` for early development. Switch to migrations for production.
- SFU and AI integrations are stubbed; next steps include Mediasoup integration and AI microservice contracts.
