"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
const express_1 = __importDefault(require("express"));
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const users_service_1 = require("./users.service");
exports.usersRouter = express_1.default.Router();
exports.usersRouter.get('/me', jwt_guard_1.jwtGuard, async (req, res) => {
    const userId = req.user.id;
    const user = await users_service_1.usersService.findById(userId);
    if (!user)
        return res.status(404).json({ error: 'User not found' });
    // hide password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...rest } = user;
    return res.json(rest);
});
