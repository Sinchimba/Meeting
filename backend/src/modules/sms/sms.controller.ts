import express from 'express';
import { jwtGuard } from '../../common/guards/jwt.guard';
import { SmsService } from './sms.service';

export const smsRouter = express.Router();
export const smsService = new SmsService();

smsRouter.get('/logs', jwtGuard, async (req, res) => {
  try {
    const logs = await smsService.getLogs();
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

smsRouter.post('/retry/:id', jwtGuard, async (req, res) => {
  try {
    const log = await smsService.retrySms(req.params.id);
    return res.json({ success: true, log });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
