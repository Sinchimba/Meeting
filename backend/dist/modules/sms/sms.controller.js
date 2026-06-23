"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = exports.smsRouter = void 0;
const express_1 = __importDefault(require("express"));
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const sms_service_1 = require("./sms.service");
exports.smsRouter = express_1.default.Router();
exports.smsService = new sms_service_1.SmsService();
exports.smsRouter.get('/logs', jwt_guard_1.jwtGuard, async (req, res) => {
    try {
        const logs = await exports.smsService.getLogs();
        return res.json(logs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.smsRouter.post('/retry/:id', jwt_guard_1.jwtGuard, async (req, res) => {
    try {
        const log = await exports.smsService.retrySms(req.params.id);
        return res.json({ success: true, log });
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
});
