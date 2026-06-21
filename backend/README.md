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
cd ..
docker-compose up --build
```

3. Or run locally from the backend folder using SQLite for local development:

```bash
npm ci
npm run dev
```

By default, local development uses a SQLite database at `backend/data/mute.sqlite`.

If you want to use the bundled Docker MySQL service, set `DATABASE_URL=mysql://mute:mute@mysql:3306/mute` and `DB_TYPE=mysql` in `backend/.env`.

4. Or run locally from the backend folder:

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
