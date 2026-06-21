import 'reflect-metadata';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { createSocketServer } from './socket/socket.gateway';
import { AppDataSource } from './data-source';
import { authRouter } from './modules/auth/auth.controller';
import { usersRouter } from './modules/users/users.controller';
import { meetingsRouter } from './modules/meetings/meetings.controller';
import { aiRouter } from './modules/ai/ai.controller';

// Load environment variables
dotenv.config();


const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/ai', aiRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
createSocketServer(server);

const PORT = process.env.PORT || 4000;

AppDataSource.initialize()
  .then(() => {
    server.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('DB init error', err);
    process.exit(1);
  });
