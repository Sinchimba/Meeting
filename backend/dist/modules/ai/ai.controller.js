"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = __importDefault(require("express"));
const jwt_guard_1 = require("../../common/guards/jwt.guard");
exports.aiRouter = express_1.default.Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
exports.aiRouter.get('/health', jwt_guard_1.jwtGuard, async (req, res) => {
    try {
        const response = await globalThis.fetch(`${AI_SERVICE_URL}/health`);
        if (!response.ok) {
            return res.status(response.status).json({ status: 'unhealthy', error: 'AI service error' });
        }
        const data = await response.json();
        return res.json(data);
    }
    catch (error) {
        return res.status(500).json({ status: 'unhealthy', error: error.message });
    }
});
exports.aiRouter.post('/detect-sign', jwt_guard_1.jwtGuard, async (req, res) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }
        const response = await globalThis.fetch(`${AI_SERVICE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: `AI Service Error: ${errorText}` });
        }
        const data = await response.json();
        if (data.success && data.prediction) {
            return res.json({
                detected_signs: [
                    {
                        gesture: data.prediction.sign,
                        confidence: data.prediction.confidence,
                    },
                ],
            });
        }
        return res.json({ detected_signs: [] });
    }
    catch (error) {
        console.error('AI Proxy Error:', error);
        return res.status(500).json({ error: error.message });
    }
});
