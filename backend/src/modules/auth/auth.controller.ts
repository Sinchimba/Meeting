import express from 'express';
import { authService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { sessionsService } from './sessions.service';
import { v4 as uuidv4 } from 'uuid';

export const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  try {
    const body: RegisterDto = req.body;
    const user = await authService.register(body.name, body.email, body.password, body.role);
    const token = authService.signJwt(user);
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken: token });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

authRouter.post('/login', async (req, res) => {
  const body: LoginDto = req.body;
  const user = await authService.validateUser(body.email, body.password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = authService.signJwt(user);
  // create refresh token session
  const refreshToken = uuidv4();
  const expires = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30') * 24 * 60 * 60 * 1000));
  const session = await sessionsService.create(user.id, refreshToken, expires);
  return res.json({ accessToken: token, refreshToken: { id: session.id, token: refreshToken, expiresAt: expires } });
});

authRouter.post('/refresh', async (req, res) => {
  const { id, token } = req.body.refreshToken || {};
  if (!id || !token) return res.status(400).json({ error: 'Invalid payload' });
  const s = await sessionsService.verifyRefreshToken(id, token);
  if (!s) return res.status(401).json({ error: 'Invalid refresh token' });
  const user = await (await import('../users/users.service')).usersService.findById(s.user_id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const newToken = authService.signJwt(user);
  return res.json({ accessToken: newToken });
});

authRouter.post('/logout', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  await sessionsService.revoke(sessionId);
  return res.json({ ok: true });
});
