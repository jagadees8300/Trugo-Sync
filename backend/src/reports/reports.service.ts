import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Response } from 'express';
import { Leave, LeaveDocument } from '../leave/schemas/leave.schema';
import {
  LeaveBalance,
  LeaveBalanceDocument,
} from '../leave/schemas/leave-balance.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import {
  Milestone,
  MilestoneDocument,
} from '../projects/schemas/milestone.schema';
import {
  AttendanceEntry,
  AttendanceEntryDocument,
} from '../attendance/schemas/attendance.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { isDoneStatus } from '../tasks/task-status.util';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Leave.name) private leaveModel: Model<LeaveDocument>,
    @InjectModel(LeaveBalance.name)
    private balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Milestone.name) private milestoneModel: Model<MilestoneDocument>,
    @InjectModel(AttendanceEntry.name)
    private attendanceModel: Model<AttendanceEntryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private parseYmd(date?: string) {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  private toCsv(rows: Record<string, unknown>[]) {
    if (!rows.length) return '';
    const keys = Object.keys(rows[0]);
    const escape = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
      keys.join(','),
      ...rows.map((r) => keys.map((k) => escape(r[k])).join(',')),
    ].join('\n');
  }

  private maybeCsv(
    rows: Record<string, unknown>[],
    format: string | undefined,
    filename: string,
    res?: Response,
  ) {
    if (format === 'csv' && res) {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return this.toCsv(rows);
    }
    return rows;
  }

  async leaveSummary(from?: string, to?: string, format?: string, res?: Response) {
    const fromDate = this.parseYmd(from);
    const toDate = this.parseYmd(to);
    const query: Record<string, unknown> = {};
    if (fromDate || toDate) {
      query.fromDate = {};
      if (fromDate) (query.fromDate as any).$gte = fromDate;
      if (toDate) (query.fromDate as any).$lte = toDate;
    }
    const leaves = await this.leaveModel
      .find(query)
      .populate('employeeId', 'name email')
      .lean();
    const year = new Date().getFullYear();
    const balances = await this.balanceModel.find({ year }).lean();
    const balMap = new Map(
      balances.map((b) => [`${b.userId.toString()}:${b.leaveType}`, b]),
    );

    const rows = leaves.map((l: any) => {
      const uid = l.employeeId?._id?.toString?.() ?? l.employeeId?.toString?.();
      const bal = balMap.get(`${uid}:${l.leaveType ?? 'CASUAL'}`);
      return {
        employee: l.employeeId?.name ?? 'Unknown',
        email: l.employeeId?.email ?? '',
        leaveType: l.leaveType ?? 'CASUAL',
        fromDate: l.fromDate,
        toDate: l.toDate,
        days: l.totalDays,
        status: l.status,
        remainingBalance: bal
          ? Math.max(0, bal.allocated - bal.used)
          : '',
      };
    });
    return this.maybeCsv(rows, format, 'leave-summary.csv', res);
  }

  async utilization(from?: string, to?: string, format?: string, res?: Response) {
    const fromDate = this.parseYmd(from);
    const toDate = this.parseYmd(to);
    const match: Record<string, unknown> = {
      assignedTo: { $type: 'objectId' },
    };
    if (fromDate || toDate) {
      match.createdAt = {};
      if (fromDate) (match.createdAt as any).$gte = fromDate;
      if (toDate) (match.createdAt as any).$lte = toDate;
    }

    const results = await this.taskModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $in: ['$status', ['DONE', 'COMPLETED']] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
    ]);

    const rows = results.map((r) => ({
      employee: r.user.name,
      email: r.user.email,
      assigned: r.total,
      completed: r.completed,
      completionPercent:
        r.total === 0 ? 0 : Math.round((r.completed / r.total) * 100),
    }));
    return this.maybeCsv(rows, format, 'utilization.csv', res);
  }

  async attendance(from?: string, to?: string, format?: string, res?: Response) {
    const fromDate = this.parseYmd(from) ?? new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
    const toDate = this.parseYmd(to) ?? new Date();

    const punches = await this.attendanceModel
      .find({ date: { $gte: fromDate, $lte: toDate } })
      .lean();
    const leaves = await this.leaveModel
      .find({
        status: 'Approved',
        fromDate: { $lte: toDate },
        toDate: { $gte: fromDate },
      })
      .lean();

    const users = await this.userModel
      .find({ role: { $ne: 'ADMIN' } })
      .select('name email')
      .lean();

    const rows = users.map((u) => {
      const uid = u._id.toString();
      const userPunches = punches.filter((p) => p.userId.toString() === uid);
      const hours = userPunches.reduce((sum, p) => {
        if (!p.clockOut) return sum;
        return (
          sum +
          (new Date(p.clockOut).getTime() - new Date(p.clockIn).getTime()) /
            (1000 * 60 * 60)
        );
      }, 0);
      const leaveDays = leaves
        .filter((l) => l.employeeId.toString() === uid)
        .reduce((sum, l) => sum + l.totalDays, 0);
      return {
        employee: u.name,
        email: u.email,
        clockDays: userPunches.length,
        hours: Math.round(hours * 100) / 100,
        leaveDays,
      };
    });
    return this.maybeCsv(rows, format, 'attendance.csv', res);
  }

  async projectHealth(format?: string, res?: Response) {
    const projects = await this.projectModel.find().lean();
    const now = new Date();
    const rows = await Promise.all(
      projects.map(async (p) => {
        const tasks = await this.taskModel.find({ projectId: p._id }).lean();
        const total = tasks.length;
        const done = tasks.filter((t) => isDoneStatus(t.status)).length;
        const overdue = tasks.filter(
          (t) => t.deadline && !isDoneStatus(t.status) && new Date(t.deadline) < now,
        ).length;
        const milestones = await this.milestoneModel
          .find({ projectId: p._id })
          .lean();
        const slipped = milestones.filter(
          (m) =>
            m.dueDate &&
            m.status !== 'DONE' &&
            new Date(m.dueDate) < now,
        ).length;
        return {
          project: p.name,
          totalTasks: total,
          doneTasks: done,
          completionPercent: total === 0 ? 0 : Math.round((done / total) * 100),
          overdueTasks: overdue,
          milestones: milestones.length,
          slippedMilestones: slipped,
        };
      }),
    );
    return this.maybeCsv(rows, format, 'project-health.csv', res);
  }
}
