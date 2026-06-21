import { AppDataSource } from '../../data-source';
import { Meeting } from './meeting.entity';

const meetingRepo = () => AppDataSource.getRepository(Meeting);

function generateGoogleMeetId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (length: number) => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `${part(3)}-${part(4)}-${part(3)}`;
}

export class MeetingsService {
  async create(title: string, hostId: string) {
    const repo = meetingRepo();
    const meetingId = generateGoogleMeetId();
    const meeting = repo.create({ id: meetingId, title, host_id: hostId, start_time: new Date(), status: 'active' });
    return repo.save(meeting);
  }

  async findById(id: string) {
    return meetingRepo().findOneBy({ id });
  }

  async endMeeting(id: string) {
    const repo = meetingRepo();
    await repo.update(id, { status: 'ended' });
    return repo.findOneBy({ id });
  }
}

export const meetingsService = new MeetingsService();
