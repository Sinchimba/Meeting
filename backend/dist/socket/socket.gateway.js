"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSocketServer = createSocketServer;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../data-source");
const meeting_entity_1 = require("../modules/meetings/meeting.entity");
function createSocketServer(server) {
    const io = new socket_io_1.Server(server, {
        path: '/ws',
        cors: { origin: true, credentials: true },
    });
    const connectedUsers = new Map();
    const verifyToken = (token) => {
        if (!token || typeof token !== 'string') {
            throw new Error('Missing auth token');
        }
        const secret = process.env.JWT_SECRET || 'changeme';
        return jsonwebtoken_1.default.verify(token, secret);
    };
    io.on('connection', (socket) => {
        socket.on('join-meeting', async (data) => {
            try {
                const payload = verifyToken(data?.token);
                if (!data?.meetingId) {
                    throw new Error('Missing meeting ID');
                }
                const meetingId = data.meetingId;
                const meta = {
                    meetingId,
                    userId: payload.sub,
                    userName: data.userName || 'Anonymous',
                    role: payload.role || 'standard',
                };
                await socket.join(meetingId);
                connectedUsers.set(socket.id, meta);
                const roomSockets = io.sockets.adapter.rooms.get(meetingId) || new Set();
                const allParticipants = Array.from(roomSockets)
                    .map((socketId) => {
                    const info = connectedUsers.get(socketId);
                    return info ? { socketId, ...info } : null;
                })
                    .filter(Boolean);
                io.to(meetingId).emit('participants-updated', allParticipants);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to join meeting';
                socket.emit('meeting-error', { message });
                socket.disconnect();
            }
        });
        socket.on('speech-transcribed', (payload) => {
            if (!payload?.meetingId)
                return;
            socket.to(payload.meetingId).emit('receive-transcript', {
                ...payload,
                from: socket.id
            });
        });
        socket.on('sign-detected', (payload) => {
            if (!payload?.meetingId)
                return;
            socket.to(payload.meetingId).emit('receive-sign', {
                ...payload,
                from: socket.id
            });
        });
        socket.on('offer', (data) => {
            if (!data?.to || !data?.offer)
                return;
            io.to(data.to).emit('receive-offer', { from: socket.id, offer: data.offer });
        });
        socket.on('answer', (data) => {
            if (!data?.to || !data?.answer)
                return;
            io.to(data.to).emit('receive-answer', { from: socket.id, answer: data.answer });
        });
        socket.on('ice-candidate', (data) => {
            if (!data?.to || !data?.candidate)
                return;
            io.to(data.to).emit('receive-ice-candidate', { from: socket.id, candidate: data.candidate });
        });
        socket.on('admin-mute-participant', async (data) => {
            try {
                const { meetingId, targetSocketId } = data || {};
                if (!meetingId || !targetSocketId)
                    return;
                const requesterMeta = connectedUsers.get(socket.id);
                if (!requesterMeta)
                    return;
                const meetingRepo = data_source_1.AppDataSource.getRepository(meeting_entity_1.Meeting);
                const meeting = await meetingRepo.findOneBy({ id: meetingId });
                if (!meeting || meeting.host_id !== requesterMeta.userId) {
                    console.warn(`Unauthorized admin-mute-participant request from user ${requesterMeta.userId}`);
                    return;
                }
                io.to(targetSocketId).emit('admin-muted-you', { by: requesterMeta.userName });
            }
            catch (err) {
                console.error('Error in admin-mute-participant:', err);
            }
        });
        socket.on('admin-kick-participant', async (data) => {
            try {
                const { meetingId, targetSocketId } = data || {};
                if (!meetingId || !targetSocketId)
                    return;
                const requesterMeta = connectedUsers.get(socket.id);
                if (!requesterMeta)
                    return;
                const meetingRepo = data_source_1.AppDataSource.getRepository(meeting_entity_1.Meeting);
                const meeting = await meetingRepo.findOneBy({ id: meetingId });
                if (!meeting || meeting.host_id !== requesterMeta.userId) {
                    console.warn(`Unauthorized admin-kick-participant request from user ${requesterMeta.userId}`);
                    return;
                }
                io.to(targetSocketId).emit('admin-kicked-you', { by: requesterMeta.userName });
            }
            catch (err) {
                console.error('Error in admin-kick-participant:', err);
            }
        });
        socket.on('admin-end-meeting', async (data) => {
            try {
                const { meetingId } = data || {};
                if (!meetingId)
                    return;
                const requesterMeta = connectedUsers.get(socket.id);
                if (!requesterMeta)
                    return;
                const meetingRepo = data_source_1.AppDataSource.getRepository(meeting_entity_1.Meeting);
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
            }
            catch (err) {
                console.error('Error in admin-end-meeting:', err);
            }
        });
        socket.on('disconnect', () => {
            const meta = connectedUsers.get(socket.id);
            if (meta) {
                connectedUsers.delete(socket.id);
                socket.to(meta.meetingId).emit('participant-left', { socketId: socket.id });
                const roomSockets = io.sockets.adapter.rooms.get(meta.meetingId) || new Set();
                const remainingParticipants = Array.from(roomSockets)
                    .map((socketId) => {
                    const info = connectedUsers.get(socketId);
                    return info ? { socketId, ...info } : null;
                })
                    .filter(Boolean);
                socket.to(meta.meetingId).emit('participants-updated', remainingParticipants);
            }
        });
    });
    return io;
}
