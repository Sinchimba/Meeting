"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
require("reflect-metadata");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./modules/users/user.entity");
const meeting_entity_1 = require("./modules/meetings/meeting.entity");
const translation_entity_1 = require("./modules/translation/translation.entity");
const session_entity_1 = require("./modules/auth/session.entity");
const sms_log_entity_1 = require("./modules/sms/sms-log.entity");
const DEFAULT_SQLITE_DB = path_1.default.resolve(__dirname, '../data/mute.sqlite');
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const dbType = process.env.DB_TYPE || (rawDatabaseUrl.startsWith('mysql://') ? 'mysql' : 'sqlite');
const sqliteDatabase = (() => {
    if (dbType !== 'sqlite')
        return DEFAULT_SQLITE_DB;
    if (rawDatabaseUrl.startsWith('sqlite://')) {
        const sqlitePath = rawDatabaseUrl.replace(/^sqlite:\/\//, '');
        return sqlitePath ? path_1.default.resolve(sqlitePath) : DEFAULT_SQLITE_DB;
    }
    return path_1.default.resolve(rawDatabaseUrl || DEFAULT_SQLITE_DB);
})();
if (dbType === 'sqlite') {
    const sqliteDir = path_1.default.dirname(sqliteDatabase);
    if (!fs_1.default.existsSync(sqliteDir)) {
        fs_1.default.mkdirSync(sqliteDir, { recursive: true });
    }
}
const databaseOptions = dbType === 'sqlite'
    ? {
        type: 'sqlite',
        database: sqliteDatabase,
    }
    : {
        type: 'mysql',
        url: process.env.DATABASE_URL,
    };
exports.AppDataSource = new typeorm_1.DataSource({
    ...databaseOptions,
    synchronize: true,
    logging: false,
    entities: [user_entity_1.User, meeting_entity_1.Meeting, translation_entity_1.TranslationLog, session_entity_1.Session, sms_log_entity_1.SmsLog],
});
exports.default = exports.AppDataSource;
