"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_service_1 = require("./auth.service");
const sessions_service_1 = require("./sessions.service");
const uuid_1 = require("uuid");
exports.authRouter = express_1.default.Router();
exports.authRouter.post('/register', async (req, res) => {
    try {
        const body = req.body;
        const user = await auth_service_1.authService.register(body.name, body.email, body.password, body.role);
        const token = auth_service_1.authService.signJwt(user);
        return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, accessToken: token });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    const body = req.body;
    const user = await auth_service_1.authService.validateUser(body.email, body.password);
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = auth_service_1.authService.signJwt(user);
    // create refresh token session
    const refreshToken = (0, uuid_1.v4)();
    const expires = new Date(Date.now() + (Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30') * 24 * 60 * 60 * 1000));
    const session = await sessions_service_1.sessionsService.create(user.id, refreshToken, expires);
    return res.json({ accessToken: token, refreshToken: { id: session.id, token: refreshToken, expiresAt: expires } });
});
exports.authRouter.post('/refresh', async (req, res) => {
    const { id, token } = req.body.refreshToken || {};
    if (!id || !token)
        return res.status(400).json({ error: 'Invalid payload' });
    const s = await sessions_service_1.sessionsService.verifyRefreshToken(id, token);
    if (!s)
        return res.status(401).json({ error: 'Invalid refresh token' });
    const user = await (await Promise.resolve().then(() => __importStar(require('../users/users.service')))).usersService.findById(s.user_id);
    if (!user)
        return res.status(401).json({ error: 'User not found' });
    const newToken = auth_service_1.authService.signJwt(user);
    return res.json({ accessToken: newToken });
});
exports.authRouter.post('/logout', async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId)
        return res.status(400).json({ error: 'sessionId required' });
    await sessions_service_1.sessionsService.revoke(sessionId);
    return res.json({ ok: true });
});
