import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './modules/users/user.entity';
import { Meeting } from './modules/meetings/meeting.entity';
import { TranslationLog } from './modules/translation/translation.entity';
import { Session } from './modules/auth/session.entity';

const DEFAULT_SQLITE_DB = path.resolve(__dirname, '../data/mute.sqlite');
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const dbType = process.env.DB_TYPE || (rawDatabaseUrl.startsWith('mysql://') ? 'mysql' : 'sqlite');

const sqliteDatabase = (() => {
  if (dbType !== 'sqlite') return DEFAULT_SQLITE_DB;

  if (rawDatabaseUrl.startsWith('sqlite://')) {
    const sqlitePath = rawDatabaseUrl.replace(/^sqlite:\/\//, '');
    return sqlitePath ? path.resolve(sqlitePath) : DEFAULT_SQLITE_DB;
  }

  return path.resolve(rawDatabaseUrl || DEFAULT_SQLITE_DB);
})();

if (dbType === 'sqlite') {
  const sqliteDir = path.dirname(sqliteDatabase);
  if (!fs.existsSync(sqliteDir)) {
    fs.mkdirSync(sqliteDir, { recursive: true });
  }
}

const databaseOptions: any =
  dbType === 'sqlite'
    ? {
        type: 'sqlite',
        database: sqliteDatabase,
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
