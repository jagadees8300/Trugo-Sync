import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Leave, LeaveDocument, LeaveType } from './schemas/leave.schema';
import {
  LeaveBalance,
  LeaveBalanceDocument,
} from './schemas/leave-balance.schema';
import { Holiday, HolidayDocument } from './schemas/holiday.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  AttendanceEntry,
  AttendanceEntryDocument,
} from '../attendance/schemas/attendance.schema';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateLeaveBalanceDto } from './dto/update-leave-balance.dto';
import type { AuthUser } from '../auth/auth-user';
import { canApproveLeave } from '../auth/auth-user';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_ALLOCATIONS: Record<Exclude<LeaveType, 'UNPAID'>, number> = {
  CASUAL: 12,
  SICK: 10,
  EARNED: 15,
};

const PAID_TYPES: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];

/** Staff who appear in Team Overview / Present Today (not Admin or Client). */
const STAFF_ROLES = ['HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] as const;

@Injectable()
export class LeaveService implements OnModuleInit {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(LeaveBalance.name)
    private balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(Holiday.name) private holidayModel: Model<HolidayDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(AttendanceEntry.name)
    private attendanceModel: Model<AttendanceEntryDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.normalizeLeaveDates();
    await this.ensureDefaultBalances();
    await this.cleanupSmokeTestLeaves();
  }

  /** Remove leave rows created only by API smoke tests. */
  private async cleanupSmokeTestLeaves() {
    // Smoke script creates short same-day leaves; also clear rows tied to deleted smoke users.
    const smokeUsers = await this.userModel
      .find({
        $or: [
          { name: 'Smoke Employee' },
          { email: { $regex: /^smokeemp\d+@trugosync\.com$/i } },
        ],
      })
      .select('_id')
      .lean();
    if (smokeUsers.length === 0) return;
    const ids = smokeUsers.map((u) => u._id);
    const result = await this.leaveModel.deleteMany({ employeeId: { $in: ids } });
    if (result.deletedCount > 0) {
      console.log(`Removed ${result.deletedCount} smoke/test leave request(s)`);
    }
  }

  private async normalizeLeaveDates() {
    const leaves = await this.leaveModel.find();
    for (const leave of leaves) {
      if (!leave.leaveType) leave.leaveType = 'CASUAL';
      const fromDate = this.startOfDay(leave.fromDate);
      const toDate = this.startOfDay(leave.toDate);
      const changed =
        fromDate.getTime() !== new Date(leave.fromDate).getTime() ||
        toDate.getTime() !== new Date(leave.toDate).getTime();
      if (changed) {
        leave.fromDate = fromDate;
        leave.toDate = toDate;
      }
      await leave.save();
    }
  }

  private async ensureDefaultBalances() {
    const year = new Date().getFullYear();
    const users = await this.userModel.find({ role: { $ne: 'ADMIN' } }).select('_id');
    for (const user of users) {
      await this.ensureUserBalances(user._id.toString(), year);
    }
  }

  private async ensureUserBalances(userId: string, year: number) {
    for (const leaveType of PAID_TYPES) {
      const exists = await this.balanceModel.findOne({
        userId: new Types.ObjectId(userId),
        year,
        leaveType,
      });
      if (!exists) {
        await this.balanceModel.create({
          userId: new Types.ObjectId(userId),
          year,
          leaveType,
          allocated: DEFAULT_ALLOCATIONS[leaveType],
          used: 0,
        });
      }
    }
  }

  private parseYmd(date: string) {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) {
      throw new BadRequestException('Date must be YYYY-MM-DD');
    }
    return new Date(Date.UTC(y, m - 1, d));
  }

  private toYmd(date: Date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfDay(date: Date | string) {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return this.parseYmd(date);
    }
    const d = date instanceof Date ? date : new Date(date);
    return this.parseYmd(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    );
  }

  private endOfDay(date: Date | string) {
    const d = this.startOfDay(date);
    return new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  private async holidaySet(from: Date, to: Date): Promise<Set<string>> {
    const holidays = await this.holidayModel
      .find({ date: { $gte: from, $lte: to }, optional: { $ne: true } })
      .lean();
    return new Set(holidays.map((h) => this.toYmd(new Date(h.date))));
  }

  private async computeWorkingDays(
    fromDate: string,
    toDate: string,
    isHalfDay?: boolean,
  ): Promise<number> {
    if (isHalfDay) return 0.5;
    const from = this.startOfDay(fromDate);
    const to = this.startOfDay(toDate);
    const holidays = await this.holidaySet(from, to);
    let days = 0;
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      if (holidays.has(this.toYmd(d))) continue;
      days += 1;
    }
    return Math.max(days, 0.5);
  }

  private formatLeave(doc: any) {
    const employee = doc.employeeId;
    return {
      _id: doc._id,
      employeeId: employee?._id?.toString?.() ?? employee?.toString?.() ?? doc.employeeId,
      employeeName: employee?.name ?? 'Unknown',
      fromDate: doc.fromDate,
      toDate: doc.toDate,
      totalDays: doc.totalDays,
      leaveType: doc.leaveType ?? 'CASUAL',
      isHalfDay: !!doc.isHalfDay,
      halfDaySession: doc.halfDaySession,
      status: doc.status,
      decisionReason: doc.decisionReason,
      decidedAt: doc.decidedAt,
      createdAt: doc.createdAt,
    };
  }

  private formatBalance(b: LeaveBalanceDocument | any) {
    return {
      _id: b._id,
      userId: b.userId?.toString?.() ?? b.userId,
      year: b.year,
      leaveType: b.leaveType,
      allocated: b.allocated,
      used: b.used,
      remaining: Math.max(0, b.allocated - b.used),
    };
  }

  async create(dto: CreateLeaveDto, requester: AuthUser) {
    const employeeId =
      canApproveLeave(requester) && dto.employeeId
        ? dto.employeeId
        : requester.userId;

    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employeeId');
    }

    const employee = await this.userModel.findById(employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    const isHalfDay = !!dto.isHalfDay;
    if (isHalfDay && !dto.halfDaySession) {
      throw new BadRequestException('halfDaySession is required for half-day leave');
    }
    if (isHalfDay && dto.fromDate !== dto.toDate) {
      throw new BadRequestException('Half-day leave must be a single date');
    }

    const from = this.startOfDay(dto.fromDate);
    const to = this.startOfDay(dto.toDate);
    if (to < from) {
      throw new BadRequestException('toDate must be on or after fromDate');
    }

    const leaveType = dto.leaveType ?? 'CASUAL';
    const totalDays = await this.computeWorkingDays(
      dto.fromDate,
      dto.toDate,
      isHalfDay,
    );

    if (PAID_TYPES.includes(leaveType)) {
      const year = from.getUTCFullYear();
      await this.ensureUserBalances(employeeId, year);
      const balance = await this.balanceModel.findOne({
        userId: new Types.ObjectId(employeeId),
        year,
        leaveType,
      });
      if (!balance || balance.allocated - balance.used < totalDays) {
        throw new BadRequestException(
          `Insufficient ${leaveType} leave balance`,
        );
      }
    }

    await this.leaveModel.create({
      employeeId: new Types.ObjectId(employeeId),
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays,
      isHalfDay,
      halfDaySession: isHalfDay ? dto.halfDaySession : undefined,
      status: 'Pending',
    });

    const fromLabel = from.toISOString().slice(0, 10);
    const toLabel = to.toISOString().slice(0, 10);
    const range =
      fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`;
    try {
      await this.notificationsService.notifyRoles(['ADMIN', 'HR'], {
        message: `${employee.name} requested ${leaveType.toLowerCase()} leave (${totalDays} day${totalDays === 1 ? '' : 's'}: ${range})`,
        type: 'LEAVE_SUBMITTED',
        senderId: employeeId,
        excludeUserId: requester.userId,
      });
    } catch (err) {
      console.error('Failed to notify admins about leave request', err);
    }

    return { message: 'Leave request created successfully' };
  }

  async findMine(userId: string) {
    const leaves = await this.leaveModel
      .find({ employeeId: new Types.ObjectId(userId) })
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return leaves.map((l) => this.formatLeave(l));
  }

  async getMySummary(userId: string) {
    const oid = new Types.ObjectId(userId);
    const year = new Date().getFullYear();
    await this.ensureUserBalances(userId, year);
    const [pendingCount, approvedLeaves, balances] = await Promise.all([
      this.leaveModel.countDocuments({ employeeId: oid, status: 'Pending' }),
      this.leaveModel.find({ employeeId: oid, status: 'Approved' }).lean(),
      this.balanceModel.find({ userId: oid, year }).lean(),
    ]);
    const totalLeaveDays = approvedLeaves.reduce((sum, l) => sum + l.totalDays, 0);
    return {
      totalLeaveDays,
      pendingCount,
      approvedCount: approvedLeaves.length,
      balances: balances.map((b) => this.formatBalance(b)),
    };
  }

  async getMyCalendar(userId: string) {
    const leaves = await this.leaveModel
      .find({ employeeId: new Types.ObjectId(userId), status: 'Approved' })
      .lean();

    const dates: string[] = [];
    for (const leave of leaves) {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);
      for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(this.toYmd(d));
      }
    }
    return [...new Set(dates)].sort();
  }

  async getBalances(userId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    await this.ensureUserBalances(userId, y);
    const balances = await this.balanceModel
      .find({ userId: new Types.ObjectId(userId), year: y })
      .lean();
    return balances.map((b) => this.formatBalance(b));
  }

  async updateBalance(userId: string, dto: UpdateLeaveBalanceDto, year?: number) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid userId');
    }
    const y = year ?? new Date().getFullYear();
    await this.ensureUserBalances(userId, y);
    const balance = await this.balanceModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        year: y,
        leaveType: dto.leaveType,
      },
      { $set: { allocated: dto.allocated } },
      { new: true },
    );
    if (!balance) throw new NotFoundException('Balance not found');
    return this.formatBalance(balance);
  }

  async findAll() {
    const leaves = await this.leaveModel
      .find()
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return leaves.map((l) => this.formatLeave(l));
  }

  async findPending() {
    const leaves = await this.leaveModel
      .find({ status: 'Pending' })
      .populate('employeeId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return leaves.map((l) => this.formatLeave(l));
  }

  async approve(id: string, reason?: string, decidedBy?: AuthUser) {
    const leave = await this.leaveModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status === 'Approved') {
      return { message: 'Leave already approved' };
    }
    if (leave.status === 'Rejected') {
      throw new BadRequestException('Cannot approve a rejected leave');
    }

    if (PAID_TYPES.includes(leave.leaveType)) {
      const year = new Date(leave.fromDate).getUTCFullYear();
      await this.ensureUserBalances(leave.employeeId.toString(), year);
      const balance = await this.balanceModel.findOne({
        userId: leave.employeeId,
        year,
        leaveType: leave.leaveType,
      });
      if (!balance || balance.allocated - balance.used < leave.totalDays) {
        throw new BadRequestException('Insufficient leave balance to approve');
      }
      balance.used += leave.totalDays;
      await balance.save();
    }

    leave.status = 'Approved';
    leave.decisionReason = reason?.trim() || undefined;
    if (decidedBy && Types.ObjectId.isValid(decidedBy.userId)) {
      leave.decidedBy = new Types.ObjectId(decidedBy.userId);
    }
    leave.decidedAt = new Date();
    await leave.save();

    await this.notifyDecision(leave, 'Approved', reason, decidedBy);
    return { message: 'Leave Approved Successfully' };
  }

  async reject(id: string, reason?: string, decidedBy?: AuthUser) {
    const leave = await this.leaveModel.findById(id);
    if (!leave) throw new NotFoundException('Leave request not found');

    if (leave.status === 'Approved' && PAID_TYPES.includes(leave.leaveType)) {
      const year = new Date(leave.fromDate).getUTCFullYear();
      await this.balanceModel.updateOne(
        {
          userId: leave.employeeId,
          year,
          leaveType: leave.leaveType,
        },
        { $inc: { used: -leave.totalDays } },
      );
    }

    leave.status = 'Rejected';
    leave.decisionReason = reason?.trim() || undefined;
    if (decidedBy && Types.ObjectId.isValid(decidedBy.userId)) {
      leave.decidedBy = new Types.ObjectId(decidedBy.userId);
    }
    leave.decidedAt = new Date();
    await leave.save();

    await this.notifyDecision(leave, 'Rejected', reason, decidedBy);
    return { message: 'Leave Rejected Successfully' };
  }

  private async notifyDecision(
    leave: LeaveDocument,
    decision: 'Approved' | 'Rejected',
    reason?: string,
    decidedBy?: AuthUser,
  ) {
    try {
      const fromLabel = new Date(leave.fromDate).toISOString().slice(0, 10);
      const toLabel = new Date(leave.toDate).toISOString().slice(0, 10);
      const range = fromLabel === toLabel ? fromLabel : `${fromLabel} → ${toLabel}`;
      const trimmedReason = reason?.trim();
      const base = `Your ${leave.leaveType.toLowerCase()} leave (${range}) was ${decision.toLowerCase()}`;
      const message = trimmedReason ? `${base} — ${trimmedReason}` : `${base}.`;
      await this.notificationsService.create({
        userId: leave.employeeId.toString(),
        message,
        type: decision === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
        senderId: decidedBy?.userId,
        targetUserId: leave.employeeId.toString(),
      });
    } catch (err) {
      console.error('Failed to notify employee about leave decision', err);
    }
  }

  async listHolidays(year?: number) {
    const y = year ?? new Date().getFullYear();
    const start = new Date(Date.UTC(y, 0, 1));
    const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59));
    const holidays = await this.holidayModel
      .find({ date: { $gte: start, $lte: end } })
      .sort({ date: 1 })
      .lean();
    return holidays.map((h) => ({
      _id: h._id,
      name: h.name,
      date: h.date,
      optional: h.optional,
    }));
  }

  async createHoliday(dto: CreateHolidayDto) {
    const date = this.startOfDay(dto.date);
    try {
      const holiday = await this.holidayModel.create({
        name: dto.name.trim(),
        date,
        optional: !!dto.optional,
      });
      return {
        _id: holiday._id,
        name: holiday.name,
        date: holiday.date,
        optional: holiday.optional,
      };
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new BadRequestException('Holiday already exists for this date');
      }
      throw err;
    }
  }

  async deleteHoliday(id: string) {
    const deleted = await this.holidayModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Holiday not found');
    return { message: 'Holiday deleted' };
  }

  async getDashboard() {
    const today = this.startOfDay(new Date());
    const endToday = this.endOfDay(new Date());

    const staff = await this.userModel
      .find({ role: { $in: [...STAFF_ROLES] } })
      .select('_id')
      .lean();
    const staffIds = new Set(staff.map((u) => u._id.toString()));

    const onLeaveDocs = await this.leaveModel
      .find({
        status: 'Approved',
        fromDate: { $lte: endToday },
        toDate: { $gte: today },
      })
      .select('employeeId')
      .lean();

    const onLeaveIds = new Set(
      onLeaveDocs
        .map((l) => l.employeeId?.toString?.() ?? String(l.employeeId))
        .filter((id) => staffIds.has(id)),
    );
    const onLeave = onLeaveIds.size;
    const pending = await this.leaveModel.countDocuments({ status: 'Pending' });

    // Present = staff who manually clocked in today only (not total employees)
    const punches = await this.attendanceModel
      .find({
        date: today,
        clockIn: { $exists: true },
      })
      .select('userId')
      .lean();

    const clockedIds = new Set<string>();
    for (const punch of punches) {
      const id = punch.userId?.toString?.() ?? String(punch.userId);
      if (staffIds.has(id) && !onLeaveIds.has(id)) {
        clockedIds.add(id);
      }
    }
    const present = clockedIds.size;
    const absent = Math.max(0, staffIds.size - onLeave - present);

    return { present, absent, onLeave, pending };
  }

  async getByDate(date: string) {
    const dayStart = this.startOfDay(date);
    const dayEnd = this.endOfDay(date);

    const leaves = await this.leaveModel
      .find({
        status: 'Approved',
        fromDate: { $lte: dayEnd },
        toDate: { $gte: dayStart },
      })
      .populate('employeeId', 'name')
      .lean();

    return leaves.reduce((acc: any[], l: any) => {
      const employeeId =
        l.employeeId?._id?.toString?.() ?? l.employeeId?.toString?.();
      if (acc.some((item) => item.employeeId === employeeId)) return acc;
      acc.push({
        employeeId,
        employeeName: l.employeeId?.name ?? 'Unknown',
        totalDays: l.totalDays,
        leaveType: l.leaveType,
        fromDate: l.fromDate,
        toDate: l.toDate,
      });
      return acc;
    }, []);
  }

  async getAttendanceByDate(date: string) {
    const dayStart = this.startOfDay(date);
    const dayEnd = this.endOfDay(date);
    const ymd =
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : this.toYmd(dayStart);

    const holiday = await this.holidayModel.findOne({ date: dayStart }).lean();

    const employees = await this.userModel
      .find({ role: { $in: [...STAFF_ROLES] } })
      .select('name email designation role')
      .sort({ name: 1 })
      .lean();

    const leaves = await this.leaveModel
      .find({
        status: 'Approved',
        fromDate: { $lte: dayEnd },
        toDate: { $gte: dayStart },
      })
      .populate('employeeId', 'name')
      .lean();

    const onLeaveMap = new Map<string, any>();
    for (const l of leaves as any[]) {
      const employeeId =
        l.employeeId?._id?.toString?.() ?? l.employeeId?.toString?.();
      if (!employeeId || onLeaveMap.has(employeeId)) continue;
      onLeaveMap.set(employeeId, {
        employeeId,
        employeeName: l.employeeId?.name ?? 'Unknown',
        fromDate: l.fromDate,
        toDate: l.toDate,
        totalDays: l.totalDays,
        leaveType: l.leaveType,
        isHalfDay: l.isHalfDay,
      });
    }

    const onLeave = Array.from(onLeaveMap.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );

    const present = employees
      .filter((e) => !onLeaveMap.has(e._id.toString()))
      .map((e) => ({
        employeeId: e._id.toString(),
        employeeName: e.name,
        designation: (e as { designation?: string }).designation,
      }));

    return {
      date: ymd,
      presentCount: present.length,
      onLeaveCount: onLeave.length,
      totalEmployees: employees.length,
      present,
      onLeave,
      holiday: holiday
        ? { name: holiday.name, optional: holiday.optional }
        : null,
    };
  }

  async getEmployeeHistory(employeeId: string, requester?: AuthUser) {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employeeId');
    }

    if (requester && !canApproveLeave(requester) && requester.userId !== employeeId) {
      throw new ForbiddenException('Access denied');
    }

    const employee = await this.userModel.findById(employeeId).lean();
    if (!employee) throw new NotFoundException('Employee not found');

    const leaves = await this.leaveModel
      .find({
        employeeId: new Types.ObjectId(employeeId),
        status: 'Approved',
      })
      .sort({ fromDate: -1 })
      .lean();

    const history = leaves.map((l) => ({
      fromDate: l.fromDate,
      toDate: l.toDate,
      days: l.totalDays,
      leaveType: l.leaveType,
      status: l.status,
    }));

    const totalLeaveDays = history.reduce((sum, h) => sum + h.days, 0);

    return {
      employeeId,
      employeeName: employee.name,
      totalLeaveDays,
      history,
    };
  }
}
