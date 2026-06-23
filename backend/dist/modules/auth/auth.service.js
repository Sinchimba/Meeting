"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const users_service_1 = require("../users/users.service");
class AuthService {
    async register(name, email, password, role = 'standard') {
        const exists = await users_service_1.usersService.findByEmail(email);
        if (exists)
            throw new Error('Email already in use');
        const user = await users_service_1.usersService.create(name, email, password, role);
        return user;
    }
    async validateUser(email, password) {
        const user = await users_service_1.usersService.findByEmail(email);
        if (!user)
            return null;
        const ok = await bcrypt_1.default.compare(password, user.password_hash);
        if (!ok)
            return null;
        return user;
    }
    signJwt(user) {
        const secret = process.env.JWT_SECRET || 'changeme';
        const payload = { sub: user.id, role: user.role };
        const expiresIn = (process.env.JWT_EXPIRES_IN || '15m');
        const options = { expiresIn };
        const token = jsonwebtoken_1.default.sign(payload, secret, options);
        return token;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
