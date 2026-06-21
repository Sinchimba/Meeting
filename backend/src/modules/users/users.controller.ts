import express from 'express';
import { jwtGuard } from '../../common/guards/jwt.guard';
import { usersService } from './users.service';

export const usersRouter = express.Router();

usersRouter.get('/me', jwtGuard, async (req, res) => {
  const userId = (req as any).user.id;
  const user = await usersService.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  // hide password
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...rest } = user as any;
  return res.json(rest);
});
