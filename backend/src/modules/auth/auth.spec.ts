import { authService } from './auth.service';
import { usersService } from '../users/users.service';

describe('AuthService (basic)', () => {
  it('should reject registering duplicate email', async () => {
    const email = `test+${Date.now()}@example.com`;
    const user = await usersService.create('T', email, 'pass');
    await expect(authService.register('T', email, 'pass')).rejects.toThrow();
  });
});
