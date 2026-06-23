"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_gateway_1 = require("./socket/socket.gateway");
const data_source_1 = require("./data-source");
const auth_controller_1 = require("./modules/auth/auth.controller");
const users_controller_1 = require("./modules/users/users.controller");
const meetings_controller_1 = require("./modules/meetings/meetings.controller");
const ai_controller_1 = require("./modules/ai/ai.controller");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json({ limit: '2mb' }));
app.use((0, morgan_1.default)('combined'));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.use('/api/auth', auth_controller_1.authRouter);
app.use('/api/users', users_controller_1.usersRouter);
app.use('/api/meetings', meetings_controller_1.meetingsRouter);
app.use('/api/ai', ai_controller_1.aiRouter);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
const server = http_1.default.createServer(app);
(0, socket_gateway_1.createSocketServer)(server);
const PORT = process.env.PORT || 4000;
data_source_1.AppDataSource.initialize()
    .then(() => {
    server.listen(PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Backend listening on port ${PORT}`);
    });
})
    .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('DB init error', err);
    process.exit(1);
});
