"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsService = exports.SessionsService = void 0;
const data_source_1 = require("../../data-source");
const session_entity_1 = require("./session.entity");
const bcrypt_1 = __importDefault(require("bcrypt"));
const repo = () => data_source_1.AppDataSource.getRepository(session_entity_1.Session);
class SessionsService {
    async create(userId, refreshToken, expiresAt) {
        const hash = await bcrypt_1.default.hash(refreshToken, 10);
        const session = repo().create({ user_id: userId, refresh_token_hash: hash, expires_at: expiresAt });
        return repo().save(session);
    }
    async revoke(sessionId) {
        return repo().delete({ id: sessionId });
    }
    async findByUser(userId) {
        return repo().find({ where: { user_id: userId } });
    }
    async verifyRefreshToken(sessionId, token) {
        const s = await repo().findOneBy({ id: sessionId });
        if (!s)
            return false;
        const ok = await bcrypt_1.default.compare(token, s.refresh_token_hash);
        if (!ok)
            return false;
        if (new Date() > s.expires_at)
            return false;
        return s;
    }
}
exports.SessionsService = SessionsService;
exports.sessionsService = new SessionsService();
