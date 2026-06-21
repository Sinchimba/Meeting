import express from 'express';
import { jwtGuard } from '../../common/guards/jwt.guard';
import { meetingsService } from './meetings.service';

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
