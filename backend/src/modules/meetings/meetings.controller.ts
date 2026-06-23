import express from 'express';
import { jwtGuard } from '../../common/guards/jwt.guard';
import { meetingsService } from './meetings.service';
import { smsService } from '../sms/sms.controller';
import { SmsLog } from '../sms/sms-log.entity';
import { AppDataSource } from '../../data-source';

export const meetingsRouter = express.Router();

const formatMeetingResponse = (meeting: any) => {
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

meetingsRouter.post('/', jwtGuard, async (req, res) => {
  const body = req.body;
  const hostId = (req as any).user.id;
  const meeting = await meetingsService.create(body.title || 'Untitled meeting', hostId);
  return res.json(formatMeetingResponse(meeting));
});

meetingsRouter.get('/:id', jwtGuard, async (req, res) => {
  const meeting = await meetingsService.findById(req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Not found' });
  return res.json(formatMeetingResponse(meeting));
});

meetingsRouter.post('/:id/end', jwtGuard, async (req, res) => {
  const userId = (req as any).user.id;
  const meeting = await meetingsService.findById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  if (meeting.host_id !== userId) {
    return res.status(403).json({ error: 'Only the meeting host can end this meeting' });
  }
  const endedMeeting = await meetingsService.endMeeting(req.params.id);
  return res.json(formatMeetingResponse(endedMeeting));
});

meetingsRouter.post('/:id/invite', jwtGuard, async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  const meeting = await meetingsService.findById(req.params.id);
  if (!meeting) {
    return res.status(404).json({ error: 'Meeting not found' });
  }
  
  // Format phone number
  let formattedPhone: string;
  try {
    formattedPhone = smsService.formatPhoneNumber(phone);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  // Construct message with invite link
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/meeting/${meeting.id}`;
  const inviteMessage = `Join my smart meeting "${meeting.title}" here: ${inviteLink}`;

  // Create SmsLog entry
  const log = new SmsLog();
  log.phone_number = formattedPhone;
  log.message = inviteMessage;
  log.provider = process.env.SMS_PROVIDER || 'mock';
  log.status = 'pending';
  log.error_message = null;
  log.provider_response = null;
  log.retry_count = 0;

  const savedLog = await AppDataSource.getRepository(SmsLog).save(log);

  try {
    await smsService.executeSending(savedLog);
    
    // Fetch latest status
    const finalLog = await AppDataSource.getRepository(SmsLog).findOneBy({ id: savedLog.id });
    if (finalLog && finalLog.status === 'failed') {
      return res.status(400).json({ error: finalLog.error_message || 'SMS delivery failed' });
    }
    
    return res.json({ success: true, message: 'Invitation sent successfully', log: finalLog });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'SMS delivery failed' });
  }
});
