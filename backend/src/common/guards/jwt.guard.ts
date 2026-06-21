import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  role: string;
}

export function jwtGuard(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.substring(7);
  try {
    const secret = process.env.JWT_SECRET || 'changeme';
    const payload = jwt.verify(token, secret) as JwtPayload;
    // attach
    (req as any).user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
