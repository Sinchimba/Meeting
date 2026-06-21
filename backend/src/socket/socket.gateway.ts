import { Server } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../data-source';
import { Meeting } from '../modules/meetings/meeting.entity';

interface SocketUserMeta {
  meetingId: string;
  userId: string;
  userName: string;
  role: string;
}

export function createSocketServer(server: http.Server) {
  const io = new Server(server, {
    path: '/ws',
    cors: { origin: true, credentials: true },
  });

  const connectedUsers = new Map<string, SocketUserMeta>();

  const verifyToken = (token?: string) => {
    if (!token || typeof token !== 'string') {
      throw new Error('Missing auth token');
    }
    const secret = process.env.JWT_SECRET || 'changeme';
    return jwt.verify(token, secret) as { sub: string; role: string };
  };

  io.on('connection', (socket) => {
    socket.on('join-meeting', (data) => {
      try {
        const payload = verifyToken(data?.token)
        if (!data?.meetingId) {
          throw new Error('Missing meeting ID')
        }

        const meetingId = data.meetingId
        const meta: SocketUserMeta = {
          meetingId,
          userId: data.userId || payload.sub,
          userName: data.userName || 'Anonymous',
          role: data.role || payload.role || 'participant',
        }

        socket.join(meetingId)
        connectedUsers.set(socket.id, meta)

        socket.to(meetingId).emit('participant-joined', {
          socketId: socket.id,
          ...meta,
        })

        const roomSockets = io.sockets.adapter.rooms.get(meetingId) || new Set<string>()
        const currentParticipants = Array.from(roomSockets)
          .filter((id) => id !== socket.id)
          .map((socketId) => {
            const info = connectedUsers.get(socketId)
            return info ? { socketId, ...info } : null
          })
          .filter(Boolean)

        socket.emit('current-participants', currentParticipants)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to join meeting'
        socket.emit('meeting-error', { message })
        socket.disconnect()
      }
    })

    socket.on('send-message', (msg) => {
      if (!msg?.meetingId) return
      socket.to(msg.meetingId).emit('receive-message', msg)
    })

    socket.on('speech-transcribed', (payload) => {
      if (!payload?.meetingId) return
      socket.to(payload.meetingId).emit('receive-transcript', payload)
    })

    socket.on('sign-detected', (payload) => {
      if (!payload?.meetingId) return
      socket.to(payload.meetingId).emit('receive-sign', payload)
    })

    socket.on('offer', (data) => {
      if (!data?.to || !data?.offer) return
      io.to(data.to).emit('receive-offer', { from: socket.id, offer: data.offer })
    })

    socket.on('answer', (data) => {
      if (!data?.to || !data?.answer) return
      io.to(data.to).emit('receive-answer', { from: socket.id, answer: data.answer })
    })

    socket.on('ice-candidate', (data) => {
      if (!data?.to || !data?.candidate) return
      io.to(data.to).emit('receive-ice-candidate', { from: socket.id, candidate: data.candidate })
    })

    socket.on('admin-mute-participant', async (data) => {
      try {
        const { meetingId, targetSocketId } = data || {};
        if (!meetingId || !targetSocketId) return;

        const requesterMeta = connectedUsers.get(socket.id);
        if (!requesterMeta) return;

        const meetingRepo = AppDataSource.getRepository(Meeting);
        const meeting = await meetingRepo.findOneBy({ id: meetingId });
        if (!meeting || meeting.host_id !== requesterMeta.userId) {
          console.warn(`Unauthorized admin-mute-participant request from user ${requesterMeta.userId}`);
          return;
        }

        io.to(targetSocketId).emit('admin-muted-you', { by: requesterMeta.userName });
      } catch (err) {
        console.error('Error in admin-mute-participant:', err);
      }
    });

    socket.on('admin-kick-participant', async (data) => {
      try {
        const { meetingId, targetSocketId } = data || {};
        if (!meetingId || !targetSocketId) return;

        const requesterMeta = connectedUsers.get(socket.id);
        if (!requesterMeta) return;

        const meetingRepo = AppDataSource.getRepository(Meeting);
        const meeting = await meetingRepo.findOneBy({ id: meetingId });
        if (!meeting || meeting.host_id !== requesterMeta.userId) {
          console.warn(`Unauthorized admin-kick-participant request from user ${requesterMeta.userId}`);
          return;
        }

        io.to(targetSocketId).emit('admin-kicked-you', { by: requesterMeta.userName });
      } catch (err) {
        console.error('Error in admin-kick-participant:', err);
      }
    });

    socket.on('admin-end-meeting', async (data) => {
      try {
        const { meetingId } = data || {};
        if (!meetingId) return;

        const requesterMeta = connectedUsers.get(socket.id);
        if (!requesterMeta) return;

        const meetingRepo = AppDataSource.getRepository(Meeting);
        const meeting = await meetingRepo.findOneBy({ id: meetingId });
        if (!meeting || meeting.host_id !== requesterMeta.userId) {
          console.warn(`Unauthorized admin-end-meeting request from user ${requesterMeta.userId}`);
          return;
        }

        await meetingRepo.update(meetingId, { status: 'ended' });

        io.to(meetingId).emit('meeting-ended');

        const roomSockets = io.sockets.adapter.rooms.get(meetingId);
        if (roomSockets) {
          for (const socketId of Array.from(roomSockets)) {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket) {
              clientSocket.leave(meetingId);
            }
          }
        }
      } catch (err) {
        console.error('Error in admin-end-meeting:', err);
      }
    });

    socket.on('disconnect', () => {
      const meta = connectedUsers.get(socket.id)
      if (meta) {
        socket.to(meta.meetingId).emit('participant-left', { socketId: socket.id })
        connectedUsers.delete(socket.id)
      }
    })
  })

  return io
}
