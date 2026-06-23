"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtGuard = jwtGuard;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function jwtGuard(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer '))
        return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.substring(7);
    try {
        const secret = process.env.JWT_SECRET || 'changeme';
        const payload = jsonwebtoken_1.default.verify(token, secret);
        // attach
        req.user = { id: payload.sub, role: payload.role };
        return next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}
