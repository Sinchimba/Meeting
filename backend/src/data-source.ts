import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Meeting } from './modules/meetings/meeting.entity';
import { TranslationLog } from './modules/translation/translation.entity';
import { Session } from './modules/auth/session.entity';

const dbType = process.env.DB_TYPE || 'mysql';
const databaseOptions: any =
  dbType === 'sqlite'
    ? {
        type: 'sqlite',
        database: process.env.SQLITE_DATABASE || './data/sqlite.db',
      }
    : dbType === 'postgres'
    ? {
        type: 'postgres',
        url: process.env.DATABASE_URL,
      }
    : {
        type: 'mysql',
        url: process.env.DATABASE_URL,
      };

export const AppDataSource = new DataSource({
  ...databaseOptions,
  synchronize: true,
  logging: false,
  entities: [User, Meeting, TranslationLog, Session],
} as DataSourceOptions);

export default AppDataSource;
