import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AttendanceEntry,
  AttendanceEntryDocument,
} from './schemas/attendance.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { LeaveService } from '../leave/leave.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceEntry.name)
    private attendanceModel: Model<AttendanceEntryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private leaveService: LeaveService,
  ) {}

  private parseYmd(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) throw new BadRequestException('Date must be YYYY-MM-DD');
    return new Date(Date.UTC(y, m - 1, d));
  }

  private todayYmd() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  private formatEntry(doc: any) {
    const hours =
      doc.clockOut && doc.clockIn
        ? Math.round(
            ((new Date(doc.clockOut).getTime() - new Date(doc.clockIn).getTime()) /
              (1000 * 60 * 60)) *
              100,
          ) / 100
        : null;
    return {
      _id: doc._id,
      userId: doc.userId?.toString?.() ?? doc.userId,
      date: doc.date,
      clockIn: doc.clockIn,
      clockOut: doc.clockOut,
      note: doc.note,
      hours,
    };
  }

  async clockIn(userId: string, note?: string) {
    const ymd = this.todayYmd();
    const date = this.parseYmd(ymd);
    const open = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      date,
      clockOut: { $exists: false },
    });
    if (open) {
      throw new BadRequestException('Already clocked in today');
    }
    const existing = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      date,
    });
    if (existing && existing.clockOut) {
      throw new BadRequestException('Already completed attendance for today');
    }
    const entry = await this.attendanceModel.create({
      userId: new Types.ObjectId(userId),
      date,
      clockIn: new Date(),
      note,
    });
    return this.formatEntry(entry);
  }

  async clockOut(userId: string) {
    const ymd = this.todayYmd();
    const date = this.parseYmd(ymd);
    const entry = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(userId),
      date,
      clockOut: { $exists: false },
    });
    if (!entry) {
      throw new BadRequestException('No open clock-in found for today');
    }
    entry.clockOut = new Date();
    await entry.save();
    return this.formatEntry(entry);
  }

  async getMine(userId: string, from?: string, to?: string) {
    const query: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (from || to) {
      query.date = {};
      if (from) (query.date as any).$gte = this.parseYmd(from);
      if (to) (query.date as any).$lte = this.parseYmd(to);
    }
    const entries = await this.attendanceModel.find(query).sort({ date: -1 }).lean();
    return entries.map((e) => this.formatEntry(e));
  }

  async getToday(userId: string) {
    const ymd = this.todayYmd();
    const date = this.parseYmd(ymd);
    const entry = await this.attendanceModel
      .findOne({ userId: new Types.ObjectId(userId), date })
      .lean();
    return entry ? this.formatEntry(entry) : null;
  }

  async getByDate(date: string) {
    const day = this.parseYmd(date);
    const end = new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1);
    const leaveData = await this.leaveService.getAttendanceByDate(date);
    const punches = await this.attendanceModel
      .find({ date: { $gte: day, $lte: end } })
      .lean();
    const punchMap = new Map(punches.map((p) => [p.userId.toString(), this.formatEntry(p)]));

    const presentClocked = leaveData.present
      .filter((p: any) => punchMap.has(p.employeeId))
      .map((p: any) => ({
        ...p,
        attendance: punchMap.get(p.employeeId),
        status: 'CLOCKED',
      }));

    const presentNoPunch = leaveData.present
      .filter((p: any) => !punchMap.has(p.employeeId))
      .map((p: any) => ({ ...p, attendance: null, status: 'ABSENT' }));

    const onLeave = leaveData.onLeave.map((p: any) => ({
      ...p,
      attendance: punchMap.get(p.employeeId) ?? null,
      status: 'ON_LEAVE',
    }));

    return {
      ...leaveData,
      clockedCount: presentClocked.length,
      absentCount: presentNoPunch.length,
      present: presentClocked,
      absent: presentNoPunch,
      onLeave,
    };
  }
}
