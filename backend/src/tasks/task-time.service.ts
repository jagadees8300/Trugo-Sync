import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TaskTimeSession,
  TaskTimeSessionDocument,
} from './schemas/task-time-session.schema';
import { Task, TaskDocument } from './schemas/task.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import type { AuthUser } from '../auth/auth-user';
import { isElevated } from '../auth/auth-user';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { isDoneStatus, normalizeStatus } from './task-status.util';

type Requester = AuthUser;

@Injectable()
export class TaskTimeService {
  constructor(
    @InjectModel(TaskTimeSession.name)
    private sessionModel: Model<TaskTimeSessionDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  private toYmd(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private segmentMs(
    startedAt: Date,
    endedAt: Date | undefined,
    now: Date,
    running: boolean,
  ) {
    const end = endedAt ?? (running ? now : startedAt);
    return Math.max(0, end.getTime() - new Date(startedAt).getTime());
  }

  private sessionMs(session: TaskTimeSession, now = new Date()) {
    const running = session.status === 'RUNNING';
    return (session.segments ?? []).reduce(
      (sum, seg) => sum + this.segmentMs(seg.startedAt, seg.endedAt, now, running && !seg.endedAt),
      0,
    );
  }

  private formatHours(ms: number) {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const seconds = Math.floor((ms % 60000) / 1000);
    return {
      ms,
      hours: Math.round((ms / 3600000) * 100) / 100,
      label:
        hours > 0
          ? `${hours}h ${String(minutes).padStart(2, '0')}m`
          : minutes > 0
            ? `${minutes}m ${String(seconds).padStart(2, '0')}s`
            : `${seconds}s`,
      hoursPart: hours,
      minutesPart: minutes,
      secondsPart: seconds,
    };
  }

  private async assertCanView(task: TaskDocument, requester: Requester) {
    if (isElevated(requester)) return;
    const assignee = task.assignedTo?.toString();
    const creator = task.createdBy?.toString();
    if (assignee === requester.userId || creator === requester.userId) return;
    const projectId = (task as any).projectId?.toString?.() ?? (task as any).project?.toString?.();
    if (projectId && Types.ObjectId.isValid(projectId)) {
      const project = await this.projectModel
        .findById(projectId)
        .select('teamMembers createdBy clientUserId')
        .lean();
      if (
        project &&
        (project.createdBy?.toString() === requester.userId ||
          project.clientUserId?.toString() === requester.userId ||
          (project.teamMembers ?? []).some((m) => m.toString() === requester.userId))
      ) {
        return;
      }
    }
    throw new ForbiddenException('Access denied');
  }

  private async assertCanTrack(task: TaskDocument, requester: Requester) {
    if (isElevated(requester)) return;
    const assignee = task.assignedTo?.toString();
    if (assignee === requester.userId) return;
    throw new ForbiddenException('Only the assignee can track time on this task');
  }

  private async getTaskOrThrow(taskId: string) {
    if (!Types.ObjectId.isValid(taskId)) {
      throw new BadRequestException('Invalid task id');
    }
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async pauseSessionDoc(session: TaskTimeSessionDocument, now = new Date()) {
    if (session.status !== 'RUNNING') return session;
    const segs = session.segments ?? [];
    const last = segs[segs.length - 1];
    if (last && !last.endedAt) {
      last.endedAt = now;
    }
    session.status = 'PAUSED';
    session.markModified('segments');
    await session.save();
    return session;
  }

  /** Pause any other running timers for this user (one active timer at a time). */
  private async pauseOtherRunning(userId: string, exceptTaskId: string, now = new Date()) {
    const others = await this.sessionModel.find({
      userId: new Types.ObjectId(userId),
      status: 'RUNNING',
      taskId: { $ne: new Types.ObjectId(exceptTaskId) },
    });
    for (const s of others) {
      await this.pauseSessionDoc(s, now);
    }
  }

  private serializeSession(session: TaskTimeSessionDocument | null, now = new Date()) {
    if (!session) {
      return {
        status: 'IDLE' as const,
        totalMs: 0,
        total: this.formatHours(0),
        runningSince: null as string | null,
      };
    }
    const totalMs = this.sessionMs(session, now);
    const last = session.segments?.[session.segments.length - 1];
    return {
      status: session.status,
      totalMs,
      total: this.formatHours(totalMs),
      runningSince:
        session.status === 'RUNNING' && last && !last.endedAt
          ? new Date(last.startedAt).toISOString()
          : null,
    };
  }

  async start(taskId: string, requester: Requester) {
    const task = await this.getTaskOrThrow(taskId);
    await this.assertCanTrack(task, requester);
    const now = new Date();
    await this.pauseOtherRunning(requester.userId, taskId, now);

    let session = await this.sessionModel.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(requester.userId),
    });

    if (!session) {
      session = await this.sessionModel.create({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(requester.userId),
        status: 'RUNNING',
        segments: [{ startedAt: now }],
      });
    } else if (session.status === 'RUNNING') {
      // already running — no-op
    } else {
      session.segments.push({ startedAt: now });
      session.status = 'RUNNING';
      session.markModified('segments');
      await session.save();
    }

    // Move task to IN_PROGRESS if still TO_DO / PENDING
    if (task.status === 'TO_DO' || task.status === 'PENDING') {
      task.status = 'IN_PROGRESS';
      await task.save();
    }

    return this.getSummary(taskId, requester);
  }

  async pause(taskId: string, requester: Requester) {
    const task = await this.getTaskOrThrow(taskId);
    await this.assertCanTrack(task, requester);
    const session = await this.sessionModel.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(requester.userId),
    });
    if (!session) {
      throw new BadRequestException('No timer started for this task');
    }
    if (session.status !== 'RUNNING') {
      throw new BadRequestException('Timer is not running');
    }
    await this.pauseSessionDoc(session);
    return this.getSummary(taskId, requester);
  }

  async stop(taskId: string, requester: Requester) {
    const task = await this.getTaskOrThrow(taskId);
    await this.assertCanTrack(task, requester);
    const session = await this.sessionModel.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(requester.userId),
    });
    if (!session) {
      throw new BadRequestException('No timer started for this task');
    }
    const now = new Date();
    if (session.status === 'RUNNING') {
      await this.pauseSessionDoc(session, now);
    }
    session.status = 'STOPPED';
    await session.save();
    return this.getSummary(taskId, requester);
  }

  /** Auto-stop all timers on a task (e.g. when marked DONE or moved back to To Do). */
  async stopAllForTask(taskId: string) {
    const now = new Date();
    const sessions = await this.sessionModel.find({
      taskId: new Types.ObjectId(taskId),
      status: { $in: ['RUNNING', 'PAUSED'] },
    });
    for (const session of sessions) {
      if (session.status === 'RUNNING') {
        await this.pauseSessionDoc(session, now);
      }
      session.status = 'STOPPED';
      await session.save();
    }
  }

  /** Safe ObjectId string from ObjectId | string | populated {_id}. */
  private extractUserId(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (typeof value === 'string') {
      return Types.ObjectId.isValid(value) && value.length === 24 ? value : null;
    }
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    if (typeof value === 'object' && value !== null && '_id' in value) {
      return this.extractUserId((value as { _id: unknown })._id);
    }
    const asString = String(value);
    return Types.ObjectId.isValid(asString) && asString.length === 24 ? asString : null;
  }

  /**
   * Auto-start or resume timer for a user.
   * Used when status moves To Do/Done → In Progress (keeps previous TOTAL).
   */
  async autoStartForUser(taskId: string, userId: string) {
    const uid = this.extractUserId(userId);
    if (!uid) return false;
    await this.getTaskOrThrow(taskId);

    const now = new Date();
    await this.pauseOtherRunning(uid, taskId, now);

    let session = await this.sessionModel.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(uid),
    });

    if (!session) {
      await this.sessionModel.create({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(uid),
        status: 'RUNNING',
        segments: [{ startedAt: now }],
      });
      return true;
    }

    if (session.status === 'RUNNING') {
      const last = session.segments?.[session.segments.length - 1];
      if (last && !last.endedAt) return true;
      session.segments.push({ startedAt: now });
      session.markModified('segments');
      await session.save();
      return true;
    }

    // Resume STOPPED / PAUSED — keep old segments (old TOTAL)
    if (!Array.isArray(session.segments)) session.segments = [];
    const last = session.segments[session.segments.length - 1];
    if (last && !last.endedAt) {
      last.endedAt = now;
    }
    session.segments.push({ startedAt: now });
    session.status = 'RUNNING';
    session.markModified('segments');
    await session.save();
    return true;
  }

  /**
   * Who to start on → In Progress:
   * 1) Actor who dragged/clicked (so their UI shows RUNNING)
   * 2) Else assignee
   * Also resume whoever already has STOPPED time when actor has none.
   */
  private async resolveStartUserId(
    taskId: string,
    task: TaskDocument,
    actorUserId?: string,
  ): Promise<string | null> {
    const actorId = this.extractUserId(actorUserId);
    const assigneeId = this.extractUserId(task.assignedTo);

    // Prefer actor — the person who dragged To Do → In Progress must see the timer start
    if (actorId) return actorId;
    if (assigneeId) return assigneeId;

    // Fallback: anyone with prior time on this task
    const sessions = await this.sessionModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .select('userId status segments')
      .lean();
    let best: { userId: string; ms: number } | null = null;
    for (const s of sessions) {
      const ms = this.sessionMs(s as TaskTimeSession);
      if (ms > (best?.ms ?? 0)) {
        best = { userId: s.userId.toString(), ms };
      }
    }
    return best?.userId ?? null;
  }

  /**
   * Sync timer when task status changes (Kanban drag OR Start Task / Mark Complete).
   * - → IN_PROGRESS: auto start / resume (old time kept)
   * - → DONE or TO_DO: auto stop
   */
  async syncWithTaskStatus(
    taskId: string,
    previousStatus: string,
    nextStatus: string,
    actorUserId?: string,
  ): Promise<'started' | 'resumed' | 'stopped' | null> {
    const prev = normalizeStatus(previousStatus) ?? previousStatus;
    const next = normalizeStatus(nextStatus) ?? nextStatus;

    // To Do / Done / other → In Progress: always start or resume timer
    if (next === 'IN_PROGRESS' && prev !== 'IN_PROGRESS') {
      const task = await this.getTaskOrThrow(taskId);
      const userId = await this.resolveStartUserId(taskId, task, actorUserId);
      if (!userId) {
        console.warn(
          `[task-time] No user to auto-start timer for task ${taskId} (actor=${actorUserId})`,
        );
        return null;
      }

      const existing = await this.sessionModel.findOne({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
      });
      const hadPriorWork =
        !!existing &&
        (existing.segments?.length ?? 0) > 0 &&
        (existing.status === 'STOPPED' ||
          existing.status === 'PAUSED' ||
          this.sessionMs(existing) > 0);

      const ok = await this.autoStartForUser(taskId, userId);
      if (!ok) {
        console.warn(`[task-time] autoStartForUser failed for task=${taskId} user=${userId}`);
        return null;
      }
      return hadPriorWork ? 'resumed' : 'started';
    }

    if (next === 'TO_DO' || isDoneStatus(next)) {
      const active = await this.sessionModel.findOne({
        taskId: new Types.ObjectId(taskId),
        status: { $in: ['RUNNING', 'PAUSED'] },
      });
      await this.stopAllForTask(taskId);
      return active ? 'stopped' : null;
    }

    return null;
  }

  async getSummary(taskId: string, requester: Requester) {
    const task = await this.getTaskOrThrow(taskId);
    await this.assertCanView(task, requester);
    const now = new Date();

    const sessions = await this.sessionModel
      .find({ taskId: new Types.ObjectId(taskId) })
      .lean();

    const userIds = [...new Set(sessions.map((s) => s.userId.toString()))];
    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .select('name email role')
          .lean()
      : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    let totalMs = 0;
    const byDayMap = new Map<string, number>();
    const byUser: Array<{
      userId: string;
      name: string;
      email?: string;
      status: string;
      totalMs: number;
      total: ReturnType<TaskTimeService['formatHours']>;
      daily: Array<{ date: string; ms: number; hours: ReturnType<TaskTimeService['formatHours']> }>;
    }> = [];

    for (const session of sessions) {
      const uid = session.userId.toString();
      const running = session.status === 'RUNNING';
      let userMs = 0;
      const userDay = new Map<string, number>();

      for (const seg of session.segments ?? []) {
        const start = new Date(seg.startedAt);
        const end = seg.endedAt
          ? new Date(seg.endedAt)
          : running
            ? now
            : start;
        if (end <= start) continue;

        // Split across calendar days so unfinished work carries with correct daily totals
        let cursor = new Date(start);
        while (cursor < end) {
          const dayStart = new Date(
            cursor.getFullYear(),
            cursor.getMonth(),
            cursor.getDate(),
          );
          const nextDay = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          const sliceEnd = end < nextDay ? end : nextDay;
          const sliceMs = Math.max(0, sliceEnd.getTime() - cursor.getTime());
          const ymd = this.toYmd(dayStart);
          userDay.set(ymd, (userDay.get(ymd) ?? 0) + sliceMs);
          byDayMap.set(ymd, (byDayMap.get(ymd) ?? 0) + sliceMs);
          userMs += sliceMs;
          cursor = sliceEnd;
        }
      }

      totalMs += userMs;
      const u = userMap.get(uid);
      byUser.push({
        userId: uid,
        name: u?.name ?? 'Unknown',
        email: u?.email,
        status: session.status,
        totalMs: userMs,
        total: this.formatHours(userMs),
        daily: [...userDay.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, ms]) => ({
            date,
            ms,
            hours: this.formatHours(ms),
          })),
      });
    }

    byUser.sort((a, b) => b.totalMs - a.totalMs);

    const myDoc = await this.sessionModel.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(requester.userId),
    });

    const todayYmd = this.toYmd(now);
    const todayMs = byDayMap.get(todayYmd) ?? 0;

    return {
      taskId,
      totalMs,
      total: this.formatHours(totalMs),
      todayMs,
      today: this.formatHours(todayMs),
      daily: [...byDayMap.entries()]
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, ms]) => ({
          date,
          ms,
          hours: this.formatHours(ms),
        })),
      byUser,
      myTimer: this.serializeSession(myDoc, now),
      canTrack:
        isElevated(requester) ||
        task.assignedTo?.toString() === requester.userId,
    };
  }
}
