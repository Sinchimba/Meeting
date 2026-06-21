import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { usersService } from '../users/users.service';

export class AuthService {
  async register(name: string, email: string, password: string, role = 'standard') {
    const exists = await usersService.findByEmail(email);
    if (exists) throw new Error('Email already in use');
    const user = await usersService.create(name, email, password, role);
    return user;
  }

  async validateUser(email: string, password: string) {
    const user = await usersService.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return null;
    return user;
  }

  signJwt(user: any) {
    const secret: Secret = process.env.JWT_SECRET || 'changeme';
    const payload = { sub: user.id, role: user.role };
    const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
    const options: SignOptions = { expiresIn };
    const token = jwt.sign(payload, secret, options);
    return token;
  }
}

export const authService = new AuthService();
