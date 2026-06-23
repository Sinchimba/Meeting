"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingsRouter = void 0;
const express_1 = __importDefault(require("express"));
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const meetings_service_1 = require("./meetings.service");
exports.meetingsRouter = express_1.default.Router();
const formatMeetingResponse = (meeting) => {
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${meeting.id}`;
    return {
        meetingId: meeting.id,
        id: meeting.id,
        title: meeting.title,
        hostId: meeting.host_id,
        status: meeting.status,
        createdAt: meeting.created_at,
        inviteLink,
    };
};
exports.meetingsRouter.post('/', jwt_guard_1.jwtGuard, async (req, res) => {
    const body = req.body;
    const hostId = req.user.id;
    const meeting = await meetings_service_1.meetingsService.create(body.title || 'Untitled meeting', hostId);
    return res.json(formatMeetingResponse(meeting));
});
exports.meetingsRouter.get('/:id', jwt_guard_1.jwtGuard, async (req, res) => {
    const meeting = await meetings_service_1.meetingsService.findById(req.params.id);
    if (!meeting)
        return res.status(404).json({ error: 'Not found' });
    return res.json(formatMeetingResponse(meeting));
});
exports.meetingsRouter.post('/:id/end', jwt_guard_1.jwtGuard, async (req, res) => {
    const userId = req.user.id;
    const meeting = await meetings_service_1.meetingsService.findById(req.params.id);
    if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
    }
    if (meeting.host_id !== userId) {
        return res.status(403).json({ error: 'Only the meeting host can end this meeting' });
    }
    const endedMeeting = await meetings_service_1.meetingsService.endMeeting(req.params.id);
    return res.json(formatMeetingResponse(endedMeeting));
});
