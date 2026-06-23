"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meetingsService = exports.MeetingsService = void 0;
const data_source_1 = require("../../data-source");
const meeting_entity_1 = require("./meeting.entity");
const meetingRepo = () => data_source_1.AppDataSource.getRepository(meeting_entity_1.Meeting);
function generateGoogleMeetId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const part = (length) => {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };
    return `${part(3)}-${part(4)}-${part(3)}`;
}
class MeetingsService {
    async create(title, hostId) {
        const repo = meetingRepo();
        const meetingId = generateGoogleMeetId();
        const meeting = repo.create({ id: meetingId, title, host_id: hostId, start_time: new Date(), status: 'active' });
        return repo.save(meeting);
    }
    async findById(id) {
        return meetingRepo().findOneBy({ id });
    }
    async endMeeting(id) {
        const repo = meetingRepo();
        await repo.update(id, { status: 'ended' });
        return repo.findOneBy({ id });
    }
}
exports.MeetingsService = MeetingsService;
exports.meetingsService = new MeetingsService();
