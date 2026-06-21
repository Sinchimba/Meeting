import { AppDataSource } from '../../data-source';
import { Session } from './session.entity';
import bcrypt from 'bcrypt';

const repo = () => AppDataSource.getRepository(Session);

export class SessionsService {
  async create(userId: string, refreshToken: string, expiresAt: Date) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const session = repo().create({ user_id: userId, refresh_token_hash: hash, expires_at: expiresAt });
    return repo().save(session);
  }

  async revoke(sessionId: string) {
    return repo().delete({ id: sessionId });
  }

  async findByUser(userId: string) {
    return repo().find({ where: { user_id: userId } });
  }

  async verifyRefreshToken(sessionId: string, token: string) {
    const s = await repo().findOneBy({ id: sessionId });
    if (!s) return false;
    const ok = await bcrypt.compare(token, s.refresh_token_hash);
    if (!ok) return false;
    if (new Date() > s.expires_at) return false;
    return s;
  }
}

export const sessionsService = new SessionsService();
