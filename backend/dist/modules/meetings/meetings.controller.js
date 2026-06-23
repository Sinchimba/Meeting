"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingsRouter = void 0;
const express_1 = __importDefault(require("express"));
const jwt_guard_1 = require("../../common/guards/jwt.guard");
const meetings_service_1 = require("./meetings.service");
const sms_controller_1 = require("../sms/sms.controller");
const sms_log_entity_1 = require("../sms/sms-log.entity");
const data_source_1 = require("../../data-source");
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
exports.meetingsRouter.post('/:id/invite', jwt_guard_1.jwtGuard, async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    const meeting = await meetings_service_1.meetingsService.findById(req.params.id);
    if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
    }
    // Format phone number
    let formattedPhone;
    try {
        formattedPhone = sms_controller_1.smsService.formatPhoneNumber(phone);
    }
    catch (err) {
        return res.status(400).json({ error: err.message });
    }
    // Construct message with invite link
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${meeting.id}`;
    const inviteMessage = `Join my smart meeting "${meeting.title}" here: ${inviteLink}`;
    // Create SmsLog entry
    const log = new sms_log_entity_1.SmsLog();
    log.phone_number = formattedPhone;
    log.message = inviteMessage;
    log.provider = process.env.SMS_PROVIDER || 'mock';
    log.status = 'pending';
    log.error_message = null;
    log.provider_response = null;
    log.retry_count = 0;
    const savedLog = await data_source_1.AppDataSource.getRepository(sms_log_entity_1.SmsLog).save(log);
    try {
        await sms_controller_1.smsService.executeSending(savedLog);
        // Fetch latest status
        const finalLog = await data_source_1.AppDataSource.getRepository(sms_log_entity_1.SmsLog).findOneBy({ id: savedLog.id });
        if (finalLog && finalLog.status === 'failed') {
            return res.status(400).json({ error: finalLog.error_message || 'SMS delivery failed' });
        }
        return res.json({ success: true, message: 'Invitation sent successfully', log: finalLog });
    }
    catch (err) {
        return res.status(500).json({ error: err.message || 'SMS delivery failed' });
    }
});
