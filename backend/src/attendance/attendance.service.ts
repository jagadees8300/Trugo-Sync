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
import { getOfficeGeoConfig, isWithinOfficeRadius } from './geo.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceEntry.name)
    private attendanceModel: Model<AttendanceEntryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private leaveService: LeaveService,
    private notificationsService: NotificationsService,
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

  private computePauseMs(doc: any, endTime: Date) {
    const segments = doc.pauseSegments ?? [];
    return segments.reduce((sum: number, seg: { pausedAt: Date; resumedAt?: Date }) => {
      const start = new Date(seg.pausedAt).getTime();
      const end = seg.resumedAt ? new Date(seg.resumedAt).getTime() : endTime.getTime();
      return sum + Math.max(0, end - start);
    }, 0);
  }

  private computeWorkedHours(doc: any, now = new Date()) {
    if (!doc.clockIn) return null;
    const end = doc.clockOut ? new Date(doc.clockOut) : now;
    const totalMs = end.getTime() - new Date(doc.clockIn).getTime();
    const pauseMs = this.computePauseMs(doc, end);
    const workedMs = Math.max(0, totalMs - pauseMs);
    return Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100;
  }

  private formatEntry(doc: any) {
    const status = doc.clockOut
      ? 'COMPLETED'
      : doc.status === 'PAUSED'
        ? 'PAUSED'
        : 'WORKING';
    const openPause = (doc.pauseSegments ?? []).find(
      (s: { resumedAt?: Date }) => !s.resumedAt,
    );
    return {
      _id: doc._id,
      userId: doc.userId?.toString?.() ?? doc.userId,
      date: doc.date,
      clockIn: doc.clockIn,
      clockOut: doc.clockOut,
      note: doc.note,
      workMode: doc.workMode ?? 'OFFICE',
      status,
      activePauseReason: openPause?.reason ?? null,
      hours: this.computeWorkedHours(doc),
    };
  }

  private async getOpenEntry(userId: string) {
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
    return entry;
  }

  private async getEmployeeName(userId: string) {
    const employee = await this.userModel.findById(userId).select('name').lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return employee.name;
  }

  private async notifyAdmins(
    userId: string,
    message: string,
    type: 'ATTENDANCE_PAUSED' | 'ATTENDANCE_RESUMED' | 'WORK_FROM_HOME',
  ) {
    try {
      await this.notificationsService.notifyRoles(['ADMIN', 'HR'], {
        message,
        type,
        senderId: userId,
        excludeUserId: userId,
      });
    } catch (err) {
      console.error(`Failed to notify admins (${type})`, err);
    }
  }

  private async assertCanClockInToday(userId: string, date: Date) {
    const userObjectId = new Types.ObjectId(userId);
    const open = await this.attendanceModel.findOne({
      userId: userObjectId,
      date,
      clockOut: { $exists: false },
    });
    if (open) {
      throw new BadRequestException('Already clocked in today');
    }
    const existing = await this.attendanceModel.findOne({
      userId: userObjectId,
      date,
    });
    if (existing && existing.clockOut) {
      throw new BadRequestException('Already completed attendance for today');
    }
  }

  getOfficeConfig() {
    return getOfficeGeoConfig();
  }

  checkLocation(latitude: number, longitude: number) {
    const geo = isWithinOfficeRadius(latitude, longitude);
    return {
      allowed: geo.allowed,
      distanceMeters: geo.distanceMeters,
      radiusMeters: geo.radiusMeters,
      officeLat: geo.lat,
      officeLng: geo.lng,
      message: geo.allowed
        ? `Within office range (${geo.distanceMeters}m from office)`
        : 'You are outside office premises',
    };
  }

  async clockIn(
    userId: string,
    latitude: number,
    longitude: number,
    note?: string,
  ) {
    const geo = this.checkLocation(latitude, longitude);
    if (!geo.allowed) {
      throw new BadRequestException(geo.message);
    }

    const ymd = this.todayYmd();
    const date = this.parseYmd(ymd);
    await this.assertCanClockInToday(userId, date);
    const entry = await this.attendanceModel.create({
      userId: new Types.ObjectId(userId),
      date,
      clockIn: new Date(),
      note,
      workMode: 'OFFICE',
      status: 'WORKING',
      pauseSegments: [],
      clockInLatitude: latitude,
      clockInLongitude: longitude,
      clockInDistanceMeters: geo.distanceMeters,
    });
    return this.formatEntry(entry);
  }

  async clockInWorkFromHome(userId: string, note?: string) {
    const employee = await this.userModel.findById(userId).select('name').lean();
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const ymd = this.todayYmd();
    const date = this.parseYmd(ymd);
    await this.assertCanClockInToday(userId, date);

    const entry = await this.attendanceModel.create({
      userId: new Types.ObjectId(userId),
      date,
      clockIn: new Date(),
      note,
      workMode: 'WFH',
      status: 'WORKING',
      pauseSegments: [],
    });

    try {
      await this.notificationsService.notifyRoles(['ADMIN', 'HR'], {
        message: `${employee.name} is working from home today`,
        type: 'WORK_FROM_HOME',
        senderId: userId,
        excludeUserId: userId,
      });
    } catch (err) {
      console.error('Failed to notify admins about work from home', err);
    }

    return this.formatEntry(entry);
  }

  async pause(userId: string, reason?: string) {
    const employeeName = await this.getEmployeeName(userId);
    const entry = await this.getOpenEntry(userId);
    if (entry.status === 'PAUSED') {
      throw new BadRequestException('Already paused');
    }

    const now = new Date();
    entry.status = 'PAUSED';
    entry.pauseSegments = entry.pauseSegments ?? [];
    entry.pauseSegments.push({
      pausedAt: now,
      reason: reason?.trim() || undefined,
    });
    entry.markModified('pauseSegments');
    await entry.save();

    const reasonText = reason?.trim()
      ? ` (Reason: ${reason.trim()})`
      : '';
    await this.notifyAdmins(
      userId,
      `${employeeName} paused attendance${reasonText}`,
      'ATTENDANCE_PAUSED',
    );

    return this.formatEntry(entry);
  }

  async resume(userId: string) {
    const employeeName = await this.getEmployeeName(userId);
    const entry = await this.getOpenEntry(userId);
    if (entry.status !== 'PAUSED') {
      throw new BadRequestException('Not currently paused');
    }

    const segments = entry.pauseSegments ?? [];
    const open = segments[segments.length - 1];
    if (!open || open.resumedAt) {
      throw new BadRequestException('No open pause to resume');
    }

    open.resumedAt = new Date();
    entry.status = 'WORKING';
    entry.markModified('pauseSegments');
    await entry.save();

    await this.notifyAdmins(
      userId,
      `${employeeName} resumed attendance`,
      'ATTENDANCE_RESUMED',
    );

    return this.formatEntry(entry);
  }

  async clockOut(userId: string) {
    const entry = await this.getOpenEntry(userId);
    const now = new Date();

    if (entry.status === 'PAUSED') {
      const segments = entry.pauseSegments ?? [];
      const open = segments[segments.length - 1];
      if (open && !open.resumedAt) {
        open.resumedAt = now;
        entry.markModified('pauseSegments');
      }
      entry.status = 'WORKING';
    }

    entry.clockOut = now;
    entry.status = 'COMPLETED';
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
