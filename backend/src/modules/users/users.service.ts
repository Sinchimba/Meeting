import { Repository } from 'typeorm';
import { AppDataSource } from '../../data-source';
import { User } from './user.entity';
import bcrypt from 'bcrypt';

const userRepo: Repository<User> = AppDataSource.getRepository(User);

export class UsersService {
  async create(name: string, email: string, password: string, role = 'standard') {
    const hash = await bcrypt.hash(password, 10);
    const user = userRepo.create({ name, email, password_hash: hash, role });
    return userRepo.save(user);
  }

  async findByEmail(email: string) {
    return userRepo.findOneBy({ email });
  }

  async findById(id: string) {
    return userRepo.findOneBy({ id });
  }
}

export const usersService = new UsersService();
