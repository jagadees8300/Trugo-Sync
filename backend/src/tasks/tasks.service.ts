import { ForbiddenException, Injectable, NotFoundException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Project } from '../projects/schemas/project.schema';
import { User } from '../users/schemas/user.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { TaskTimeService } from './task-time.service';
import { isDoneStatus, normalizeStatus, toApiStatus } from './task-status.util';
import type { AuthUser } from '../auth/auth-user';
import { isElevated, isClient } from '../auth/auth-user';

type Requester = Pick<AuthUser, 'userId' | 'role'>;

@Injectable()
export class TasksService implements OnModuleInit {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationsService: NotificationsService,
    private taskTimeService: TaskTimeService,
  ) {}

  async onModuleInit() {
    await this.migrateStatusValues();
    await this.migrateFieldNames();
    await this.migrateInvalidReferences();
    await this.migrateCreatedBy();
    await this.cleanupSmokeTestTasks();
  }

  /** Remove leftover API smoke tasks (not linked to a real workflow). */
  private async cleanupSmokeTestTasks() {
    const result = await this.taskModel.deleteMany({
      $or: [
        { title: { $regex: /^Smoke Task/i } },
        { description: { $regex: /^API smoke$/i } },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`Removed ${result.deletedCount} smoke/test task(s) from database`);
    }
  }

  private async migrateCreatedBy() {
    const tasks = await this.taskModel.find({ createdBy: { $exists: false } }).lean();
    for (const task of tasks) {
      const created = (task.history ?? []).find((h: any) => h.action === 'Task Created');
      if (created?.changedBy) {
        await this.taskModel.updateOne(
          { _id: task._id },
          { $set: { createdBy: created.changedBy } },
        );
      }
    }
  }

  private employeeTaskFilter(userId: string) {
    const oid = new Types.ObjectId(userId);
    return {
      $or: [{ assignedTo: oid }, { createdBy: oid }],
    };
  }

  private canAccessTask(task: TaskDocument | Task, userId: string): boolean {
    const assignedRaw = (task as any).assignedTo;
    const createdRaw = (task as any).createdBy;
    const assigned =
      assignedRaw?._id?.toString?.() ??
      assignedRaw?.toString?.() ??
      String(assignedRaw ?? '');
    const created =
      createdRaw?._id?.toString?.() ??
      createdRaw?.toString?.() ??
      String(createdRaw ?? '');
    return assigned === userId || created === userId;
  }

  private async isProjectClient(projectId: unknown, userId: string) {
    if (!this.isValidObjectId(projectId)) return false;
    const project = await this.projectModel
      .findById(projectId)
      .select('clientUserId')
      .lean();
    return project?.clientUserId?.toString() === userId;
  }

  private async isProjectTeamMember(projectId: unknown, userId: string) {
    if (!this.isValidObjectId(projectId)) return false;
    const project = await this.projectModel
      .findById(projectId)
      .select('teamMembers createdBy clientUserId')
      .lean();
    if (!project) return false;
    if (project.createdBy?.toString() === userId) return true;
    if (project.clientUserId?.toString() === userId) return true;
    return (project.teamMembers ?? []).some((m) => m.toString() === userId);
  }

  private async assertTaskAccess(task: TaskDocument, requester: Requester) {
    if (isElevated(requester)) return;
    if (this.canAccessTask(task, requester.userId)) return;
    const projectRef = (task as any).projectId ?? (task as any).project;
    const projectId =
      projectRef?._id?.toString?.() ?? projectRef?.toString?.() ?? projectRef;
    if (await this.isProjectTeamMember(projectId, requester.userId)) return;
    if (isClient(requester) && (await this.isProjectClient(projectId, requester.userId))) {
      return;
    }
    throw new ForbiddenException('Access denied');
  }

  private async clientProjectIds(userId: string): Promise<Types.ObjectId[]> {
    const projects = await this.projectModel
      .find({ clientUserId: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    return projects.map((p) => p._id as Types.ObjectId);
  }

  /** Ensure task assignees become project team members (milestone access, roster). */
  private async ensureProjectTeamMember(projectId: string, userId: string) {
    if (!this.isValidObjectId(projectId) || !this.isValidObjectId(userId)) return;
    await this.projectModel.updateOne(
      { _id: new Types.ObjectId(projectId) },
      { $addToSet: { teamMembers: new Types.ObjectId(userId) } },
    );
  }

  private async assertNoCyclicDependency(
    taskId: string | undefined,
    dependsOn: string[],
  ) {
    for (const depId of dependsOn) {
      if (taskId && depId === taskId) {
        throw new BadRequestException('Task cannot depend on itself');
      }
      const visited = new Set<string>();
      const stack = [depId];
      while (stack.length) {
        const current = stack.pop()!;
        if (taskId && current === taskId) {
          throw new BadRequestException('Circular task dependency detected');
        }
        if (visited.has(current)) continue;
        visited.add(current);
        const node = await this.taskModel.findById(current).select('dependsOn').lean();
        for (const next of node?.dependsOn ?? []) {
          stack.push(next.toString());
        }
      }
    }
  }

  private async migrateStatusValues() {
    await this.taskModel.updateMany(
      { status: 'PENDING' } as any,
      { $set: { status: 'TO_DO' } },
    );
    await this.taskModel.updateMany(
      { status: 'COMPLETED' } as any,
      { $set: { status: 'DONE' } },
    );
  }

  private async migrateFieldNames() {
    const withLegacyProject = await this.taskModel.find({
      project: { $exists: true },
      projectId: { $exists: false },
    });
    for (const task of withLegacyProject) {
      await this.taskModel.updateOne(
        { _id: task._id },
        { $set: { projectId: (task as any).project }, $unset: { project: '' } },
      );
    }

    const withLegacyComments = await this.taskModel.find({
      'comments.author': { $exists: true },
    });
    for (const task of withLegacyComments) {
      const comments = (task.comments ?? []).map((c: any) => ({
        user: c.user ?? c.author,
        text: c.text,
        createdAt: c.createdAt ?? new Date(),
      }));
      await this.taskModel.updateOne({ _id: task._id }, { $set: { comments } });
    }

    await this.taskModel.updateMany({}, { $unset: { attachments: '' } });
  }

  private serializeTask(task: Task): Record<string, unknown> {
    const obj = typeof (task as any).toObject === 'function' ? (task as any).toObject() : { ...task };
    const projectRef = obj.projectId ?? obj.project;
    const createdByRole =
      obj.createdBy && typeof obj.createdBy === 'object'
        ? (obj.createdBy as { role?: string }).role
        : undefined;
    return {
      ...obj,
      status: toApiStatus(obj.status),
      projectId:
        projectRef?._id?.toString?.() ?? projectRef?.toString?.() ?? projectRef,
      project: projectRef,
      /** True only when a CLIENT user created/assigned this task (not admin/employee HIGH). */
      fromClient: createdByRole === 'CLIENT',
    };
  }

  private isValidObjectId(value: unknown): boolean {
    return Types.ObjectId.isValid(String(value)) && String(value).length === 24;
  }

  private async populateTask(task: TaskDocument, lite = false): Promise<Task> {
    const projectRef = task.projectId ?? (task as any).project;
    const paths: Array<string | { path: string; select?: string; model?: string }> = [];

    if (this.isValidObjectId(projectRef)) {
      paths.push({ path: 'projectId', model: 'Project' });
    }
    if (this.isValidObjectId(task.assignedTo)) {
      paths.push({ path: 'assignedTo', select: 'name email role designation avatarUrl' });
    }
    if (this.isValidObjectId(task.createdBy)) {
      paths.push({
        path: 'createdBy',
        select: lite ? 'name role' : 'name email role designation avatarUrl',
      });
    }
    if (!lite && task.comments?.length) {
      paths.push({ path: 'comments.user', select: 'name email avatarUrl' });
    }
    if (!lite && task.history?.length) {
      paths.push({ path: 'history.changedBy', select: 'name email avatarUrl' });
    }
    if (!lite && this.isValidObjectId(task.parentTaskId)) {
      paths.push({ path: 'parentTaskId', select: 'title status' });
    }
    if (!lite && task.dependsOn?.length) {
      paths.push({ path: 'dependsOn', select: 'title status' });
    }

    if (paths.length > 0) {
      await task.populate(paths);
    }

    return this.serializeTask(task) as unknown as Task;
  }

  private async syncProjectStats(projectId: string) {
    if (!this.isValidObjectId(projectId)) return;
    const tasks = await this.taskModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .lean();
    const total = tasks.length;
    const done = tasks.filter((t) => isDoneStatus(t.status)).length;
    const active = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    await this.projectModel.updateOne(
      { _id: projectId },
      { $set: { totalTasks: total, doneTasks: done, activeTasks: active, progress } },
    );
  }

  private async migrateInvalidReferences() {
    const tasks = await this.taskModel.find().lean();
    const slugToEmail: Record<string, string> = {
      hari: 'hari@trugosync.com',
      gopi: 'gopi@trugosync.com',
      jagan: 'admin@trugosync.com',
    };

    for (const task of tasks) {
      const updates: Record<string, Types.ObjectId | undefined> = {};

      const legacyProject = (task as any).project ?? task.projectId;
      if (legacyProject && !this.isValidObjectId(legacyProject)) {
        const projectName = String(legacyProject);
        const project = await this.projectModel.findOne({ name: projectName });
        // Never auto-create projects — create/assign only via manual or API create.
        if (project) {
          updates.projectId = project._id as Types.ObjectId;
        }
      }

      if (task.assignedTo && !this.isValidObjectId(task.assignedTo)) {
        const assigneeKey = String(task.assignedTo).toLowerCase();
        const email = slugToEmail[assigneeKey];
        const user = email
          ? await this.userModel.findOne({ email })
          : await this.userModel.findOne({
              name: { $regex: new RegExp(String(task.assignedTo), 'i') },
            });
        if (user) {
          updates.assignedTo = user._id as Types.ObjectId;
        }
      }

      if (Object.keys(updates).length > 0) {
        await this.taskModel.updateOne({ _id: task._id }, { $set: updates });
      }
    }
  }

  async create(createTaskDto: CreateTaskDto, userId?: string, requester?: Requester): Promise<Task> {
    const projectId = createTaskDto.projectId || createTaskDto.project;

    if (requester && isClient(requester)) {
      if (!projectId || !this.isValidObjectId(projectId)) {
        throw new BadRequestException('Clients must assign tasks to one of their projects');
      }
      const allowed = await this.isProjectClient(projectId, requester.userId);
      if (!allowed) {
        throw new ForbiddenException('You can only create tasks on your assigned projects');
      }
      if (!createTaskDto.assignedTo) {
        throw new BadRequestException('Please assign the task to an employee');
      }
      createTaskDto.priority = 'HIGH';
    }

    const taskData: Record<string, unknown> = {
      title: createTaskDto.title,
      description: createTaskDto.description,
      status: normalizeStatus(createTaskDto.status) || 'TO_DO',
    };

    if (createTaskDto.priority) {
      taskData.priority = createTaskDto.priority.toUpperCase();
    }
    if (createTaskDto.deadline) {
      taskData.deadline = new Date(createTaskDto.deadline);
    }
    if (projectId && this.isValidObjectId(projectId)) {
      taskData.projectId = new Types.ObjectId(projectId);
    }
    if (createTaskDto.assignedTo && this.isValidObjectId(createTaskDto.assignedTo)) {
      taskData.assignedTo = new Types.ObjectId(createTaskDto.assignedTo);
    }
    if (userId && this.isValidObjectId(userId)) {
      taskData.createdBy = new Types.ObjectId(userId);
    }
    if (createTaskDto.parentTaskId && this.isValidObjectId(createTaskDto.parentTaskId)) {
      taskData.parentTaskId = new Types.ObjectId(createTaskDto.parentTaskId);
    }
    if (createTaskDto.milestoneId && this.isValidObjectId(createTaskDto.milestoneId)) {
      taskData.milestoneId = new Types.ObjectId(createTaskDto.milestoneId);
    }
    if (createTaskDto.dependsOn?.length) {
      await this.assertNoCyclicDependency(undefined, createTaskDto.dependsOn);
      taskData.dependsOn = createTaskDto.dependsOn
        .filter((id) => this.isValidObjectId(id))
        .map((id) => new Types.ObjectId(id));
    }

    taskData.history = [
      {
        action: 'Task Created',
        changedBy: userId ? new Types.ObjectId(userId) : undefined,
        changedAt: new Date(),
      },
    ];

    const createdTask = new this.taskModel(taskData);
    const saved = await createdTask.save();

    if (createTaskDto.assignedTo && this.isValidObjectId(createTaskDto.assignedTo)) {
      const assigneeId = createTaskDto.assignedTo;
      const fromClient = requester && isClient(requester);
      await this.notificationsService.create({
        userId: assigneeId,
        message: fromClient
          ? `Client assigned a task: ${createTaskDto.title}`
          : `New task assigned: ${createTaskDto.title}`,
        type: 'TASK_ASSIGNED',
        senderId: userId,
        targetUserId: assigneeId,
      });
      try {
        await this.notificationsService.notifyRoles(['ADMIN'], {
          message: fromClient
            ? `Client assigned task "${createTaskDto.title}"`
            : `Task "${createTaskDto.title}"`,
          type: 'TASK_ASSIGNED',
          senderId: userId,
          targetUserId: assigneeId,
          excludeUserId: userId,
        });
      } catch (err) {
        console.error('Failed to notify admins about task assignment', err);
      }
      if (projectId && this.isValidObjectId(projectId)) {
        await this.ensureProjectTeamMember(projectId, assigneeId);
      }
    }

    if (projectId) {
      await this.syncProjectStats(projectId);
    }

    return this.findOne(saved._id.toString());
  }

  /** Create multiple tasks (Team Status Excel grid assign). */
  async createBulk(
    items: CreateTaskDto[],
    userId?: string,
    requester?: Requester,
  ): Promise<{ created: number; tasks: Task[] }> {
    if (!items?.length) {
      throw new BadRequestException('At least one task is required');
    }
    if (items.length > 50) {
      throw new BadRequestException('Maximum 50 tasks per request');
    }

    const tasks: Task[] = [];
    for (const item of items) {
      if (!item.title?.trim()) {
        throw new BadRequestException('Each task needs a title');
      }
      if (!item.assignedTo) {
        throw new BadRequestException('Each task needs an assignee');
      }
      const created = await this.create(item, userId, requester);
      tasks.push(created);
    }
    return { created: tasks.length, tasks };
  }

  private parseStartOfDay(dateStr?: string): Date | null {
    if (!dateStr?.trim()) return null;
    const d = new Date(dateStr.trim());
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private parseEndOfDay(dateStr?: string): Date | null {
    if (!dateStr?.trim()) return null;
    const d = new Date(dateStr.trim());
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }

  async findAll(
    filters?: {
      status?: string;
      assignedTo?: string;
      project?: string;
      search?: string;
      priority?: string;
      overdue?: boolean;
      deadlineFrom?: string;
      deadlineTo?: string;
      createdFrom?: string;
      createdTo?: string;
    },
    requester?: Requester,
  ): Promise<Task[]> {
    const query: Record<string, unknown> = {};

    if (requester && isClient(requester)) {
      const projectIds = await this.clientProjectIds(requester.userId);
      if (projectIds.length === 0) return [];
      query.projectId = { $in: projectIds };
      if (filters?.project && this.isValidObjectId(filters.project)) {
        const allowed = projectIds.some((id) => id.toString() === filters.project);
        if (!allowed) throw new ForbiddenException('Access denied');
        query.projectId = new Types.ObjectId(filters.project);
      }
    } else if (requester && !isElevated(requester)) {
      Object.assign(query, this.employeeTaskFilter(requester.userId));
      if (filters?.assignedTo && filters.assignedTo !== requester.userId) {
        throw new ForbiddenException('Access denied');
      }
    }

    if (filters?.status && filters.status !== 'ALL') {
      const normalized = normalizeStatus(filters.status);
      query.status =
        normalized === 'TO_DO'
          ? { $in: ['TO_DO', 'PENDING'] }
          : normalized === 'DONE'
            ? { $in: ['DONE', 'COMPLETED'] }
            : normalized;
    }
    if (filters?.assignedTo && this.isValidObjectId(filters.assignedTo)) {
      if (requester?.role === 'EMPLOYEE' && filters.assignedTo !== requester.userId) {
        throw new ForbiddenException('Access denied');
      }
      query.assignedTo = new Types.ObjectId(filters.assignedTo);
    }
    if (
      filters?.project &&
      this.isValidObjectId(filters.project) &&
      !(requester && isClient(requester))
    ) {
      query.projectId = new Types.ObjectId(filters.project);
    }
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    if (filters?.priority && ['HIGH', 'MEDIUM', 'LOW'].includes(filters.priority)) {
      query.priority = filters.priority;
    }

    if (filters?.overdue) {
      const overdueDeadline = {
        $exists: true,
        $ne: null,
        $lt: new Date(),
      };
      query.deadline = query.deadline
        ? { ...(query.deadline as Record<string, unknown>), ...overdueDeadline }
        : overdueDeadline;
      if (!filters?.status || filters.status === 'ALL') {
        query.status = { $nin: ['DONE', 'COMPLETED'] };
      }
    }

    const deadlineFrom = this.parseStartOfDay(filters?.deadlineFrom);
    const deadlineTo = this.parseEndOfDay(filters?.deadlineTo);
    if (deadlineFrom || deadlineTo) {
      const deadlineRange: Record<string, Date> = {};
      if (deadlineFrom) deadlineRange.$gte = deadlineFrom;
      if (deadlineTo) deadlineRange.$lte = deadlineTo;
      query.deadline = query.deadline
        ? { ...(query.deadline as Record<string, unknown>), ...deadlineRange }
        : deadlineRange;
    }

    const createdFrom = this.parseStartOfDay(filters?.createdFrom);
    const createdTo = this.parseEndOfDay(filters?.createdTo);
    if (createdFrom || createdTo) {
      query.createdAt = {};
      if (createdFrom) (query.createdAt as Record<string, Date>).$gte = createdFrom;
      if (createdTo) (query.createdAt as Record<string, Date>).$lte = createdTo;
    }

    const tasks = await this.taskModel.find(query).sort({ createdAt: -1 }).exec();
    return Promise.all(tasks.map((task) => this.populateTask(task, true)));
  }

  async findOne(id: string, requester?: Requester): Promise<Task & { subtasks?: Task[] }> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (requester) {
      await this.assertTaskAccess(task, requester);
    }
    const populated = await this.populateTask(task);
    const subtasks = await this.taskModel
      .find({ parentTaskId: new Types.ObjectId(id) })
      .select('title status _id createdAt priority')
      .sort({ createdAt: 1 })
      .lean();
    return { ...populated, subtasks: subtasks as unknown as Task[] };
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId?: string,
    requester?: Requester,
  ): Promise<Task> {
    const existing = await this.taskModel.findById(id);
    if (!existing) throw new NotFoundException('Task not found');
    if (requester) {
      await this.assertTaskAccess(existing, requester);
    }

    const historyEntries: Array<Record<string, unknown>> = [];
    const trackedFields = ['status', 'priority', 'assignedTo', 'projectId', 'title'];

    for (const field of trackedFields) {
      if (updateTaskDto[field] !== undefined) {
        const oldVal = existing[field]?.toString?.() ?? existing[field];
        let newVal = updateTaskDto[field];
        if (field === 'status' && newVal) {
          newVal = normalizeStatus(newVal as string);
        }
        if (field === 'priority' && newVal) {
          newVal = (newVal as string).toUpperCase();
        }
        const newValStr = newVal?.toString?.() ?? newVal;
        if (String(oldVal ?? '') !== String(newValStr ?? '')) {
          const actionMap: Record<string, string> = {
            status:
              isDoneStatus(String(newVal))
                ? 'Task Completed'
                : newVal === 'TO_DO'
                  ? 'Task Reopened'
                  : 'Status Updated',
            priority: 'Priority Updated',
            assignedTo: 'Assignee Updated',
            projectId: 'Project Updated',
            title: 'Title Updated',
          };
          historyEntries.push({
            action: actionMap[field] || 'Field Updated',
            field,
            oldValue: String(oldVal ?? ''),
            newValue: String(newValStr ?? ''),
            changedBy: userId ? new Types.ObjectId(userId) : undefined,
            changedAt: new Date(),
          });
        }
      }
    }

    const setFields: Record<string, unknown> = { ...updateTaskDto };
    if (setFields.status) {
      setFields.status = normalizeStatus(setFields.status as string);
    }
    if (setFields.priority) {
      setFields.priority = (setFields.priority as string).toUpperCase();
    }
    if (setFields.deadline) {
      setFields.deadline = new Date(setFields.deadline as string);
    }
    const projectRef = (setFields.projectId as string) || (setFields.project as string);
    if (projectRef && this.isValidObjectId(projectRef)) {
      setFields.projectId = new Types.ObjectId(projectRef);
    }
    delete setFields.project;
    if (setFields.assignedTo && this.isValidObjectId(setFields.assignedTo as string)) {
      setFields.assignedTo = new Types.ObjectId(setFields.assignedTo as string);
    }

    await this.taskModel.findByIdAndUpdate(id, {
      $set: setFields,
      ...(historyEntries.length > 0
        ? { $push: { history: { $each: historyEntries } } }
        : {}),
    });

    const existingProjectId = existing.projectId ?? (existing as any).project;
    const nextProjectId =
      (setFields.projectId as Types.ObjectId | undefined)?.toString?.() ??
      existingProjectId?.toString?.();
    const nextAssignee =
      setFields.assignedTo instanceof Types.ObjectId
        ? setFields.assignedTo.toString()
        : undefined;
    if (nextProjectId && nextAssignee) {
      await this.ensureProjectTeamMember(nextProjectId, nextAssignee);
    }
    if (
      nextAssignee &&
      nextAssignee !== (existing.assignedTo?.toString?.() ?? String(existing.assignedTo ?? ''))
    ) {
      await this.notificationsService.create({
        userId: nextAssignee,
        message: `New task assigned: ${existing.title}`,
        type: 'TASK_ASSIGNED',
        senderId: userId,
        targetUserId: nextAssignee,
      });
      try {
        await this.notificationsService.notifyRoles(['ADMIN'], {
          message: `Task "${existing.title}"`,
          type: 'TASK_ASSIGNED',
          senderId: userId,
          targetUserId: nextAssignee,
          excludeUserId: userId,
        });
      } catch (err) {
        console.error('Failed to notify admins about task reassignment', err);
      }
    }
    if (existingProjectId) {
      await this.syncProjectStats(existingProjectId.toString());
    }
    if (nextProjectId && nextProjectId !== existingProjectId?.toString?.()) {
      await this.syncProjectStats(nextProjectId);
    }

    return this.findOne(id, requester);
  }

  async updateStatus(
    id: string,
    status: string,
    userId?: string,
    requester?: Requester,
  ): Promise<Task> {
    const result = await this.moveWithTimer(id, status, userId, requester);
    return result.task;
  }

  /**
   * Move task status and sync timer (Kanban drag / Start / Complete / Reopen).
   * To Do → In Progress = start, Done → In Progress = resume old time,
   * In Progress → Done = stop.
   */
  async moveWithTimer(
    id: string,
    status: string,
    userId?: string,
    requester?: Requester,
  ): Promise<{
    task: Task;
    timerSync: 'started' | 'resumed' | 'stopped' | null;
    timer?: Awaited<ReturnType<TaskTimeService['getSummary']>>;
  }> {
    const existing = await this.taskModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Task not found');

    const previousStatus = existing.status;
    const normalized = normalizeStatus(status) || status;
    const actorId = userId ?? requester?.userId;

    if (isDoneStatus(normalized)) {
      const deps = existing.dependsOn ?? [];
      if (deps.length) {
        const blockers = await this.taskModel
          .find({ _id: { $in: deps } })
          .select('title status')
          .lean();
        const open = blockers.filter((b) => !isDoneStatus(b.status));
        if (open.length) {
          throw new BadRequestException(
            `Blocked by unfinished tasks: ${open.map((b) => b.title).join(', ')}`,
          );
        }
      }
    }

    const updated = await this.update(id, { status: normalized }, userId, requester);

    const timerSync = await this.taskTimeService.syncWithTaskStatus(
      id,
      previousStatus,
      normalized,
      actorId,
    );

    let timer: Awaited<ReturnType<TaskTimeService['getSummary']>> | undefined;
    if (requester && (timerSync || normalized === 'IN_PROGRESS')) {
      timer = await this.taskTimeService.getSummary(id, requester as AuthUser);
    }

    return { task: updated, timerSync, ...(timer ? { timer } : {}) };
  }

  async getSubtasks(parentTaskId: string, requester?: Requester) {
    if (!this.isValidObjectId(parentTaskId)) {
      throw new NotFoundException('Task not found');
    }
    const parent = await this.taskModel.findById(parentTaskId).select('_id assignedTo createdBy projectId').exec();
    if (!parent) throw new NotFoundException('Task not found');
    if (requester) {
      await this.assertTaskAccess(parent as TaskDocument, requester);
    }
    const tasks = await this.taskModel
      .find({ parentTaskId: new Types.ObjectId(parentTaskId) })
      .select('title status _id createdAt priority assignedTo')
      .sort({ createdAt: 1 })
      .populate({ path: 'assignedTo', select: 'name' })
      .lean();
    return tasks;
  }

  async addComment(
    id: string,
    text: string,
    userId: string,
    requester?: Requester,
  ): Promise<Task> {
    const task = await this.taskModel.findById(id);
    if (!task) throw new NotFoundException('Task not found');
    if (requester) {
      await this.assertTaskAccess(task, requester);
    }

    await this.taskModel.findByIdAndUpdate(id, {
      $push: {
        comments: {
          text,
          user: new Types.ObjectId(userId),
          createdAt: new Date(),
        },
      },
    });

    if (task.assignedTo && task.assignedTo.toString() !== userId) {
      await this.notificationsService.create({
        userId: task.assignedTo.toString(),
        message: `New comment on task: ${task.title}`,
        type: 'COMMENT_ADDED',
        senderId: userId,
      });
    }

    return this.findOne(id, requester);
  }

  async remove(id: string): Promise<Task> {
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();
    if (!deletedTask) throw new NotFoundException('Task not found');
    const projectRef = deletedTask.projectId ?? (deletedTask as any).project;
    const projectId =
      projectRef?._id?.toString?.() ?? projectRef?.toString?.() ?? projectRef;
    if (projectId) {
      await this.syncProjectStats(String(projectId));
    }
    return deletedTask;
  }

  async getMyStats(requester: Requester) {
    let scope: Record<string, unknown>;
    if (isClient(requester)) {
      const projectIds = await this.clientProjectIds(requester.userId);
      if (projectIds.length === 0) {
        return { total: 0, completed: 0, pending: 0, inProgress: 0, highPriority: 0 };
      }
      scope = { projectId: { $in: projectIds } };
    } else {
      scope = this.employeeTaskFilter(requester.userId);
    }
    const openHighFilter = {
      $and: [
        scope,
        { priority: 'HIGH' as const },
        { status: { $nin: ['DONE', 'COMPLETED'] } },
      ],
    };
    const [total, completed, pending, inProgress, highPriority] = await Promise.all([
      this.taskModel.countDocuments(scope),
      this.taskModel.countDocuments({
        ...scope,
        status: { $in: ['DONE', 'COMPLETED'] },
      }),
      this.taskModel.countDocuments({
        ...scope,
        status: { $in: ['TO_DO', 'PENDING'] },
      }),
      this.taskModel.countDocuments({ ...scope, status: 'IN_PROGRESS' }),
      this.taskModel.countDocuments(openHighFilter as any),
    ]);
    return { total, completed, pending, inProgress, highPriority };
  }

  async getStats() {
    const openHighFilter = {
      priority: 'HIGH' as const,
      status: { $nin: ['DONE', 'COMPLETED'] },
    };
    const [total, completed, pending, inProgress, highPriority] = await Promise.all([
      this.taskModel.countDocuments(),
      this.taskModel.countDocuments({ status: { $in: ['DONE', 'COMPLETED'] } }),
      this.taskModel.countDocuments({ status: { $in: ['TO_DO', 'PENDING'] } }),
      this.taskModel.countDocuments({ status: 'IN_PROGRESS' }),
      this.taskModel.countDocuments(openHighFilter as any),
    ]);
    return { total, completed, pending, inProgress, highPriority };
  }

  async getTeamStatus() {
    const results = await this.taskModel.aggregate([
      { $match: { assignedTo: { $type: 'objectId' } } },
      {
        $group: {
          _id: '$assignedTo',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ['$status', ['DONE', 'COMPLETED']] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ['$status', ['TO_DO', 'PENDING']] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
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
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          total: 1,
          completed: 1,
          pending: 1,
          inProgress: 1,
          completionPercent: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] },
            ],
          },
        },
      },
      { $addFields: { nameSort: { $toLower: { $ifNull: ['$name', ''] } } } },
      { $sort: { nameSort: 1 } },
      { $project: { nameSort: 0 } },
    ]);
    return results;
  }

  async getProjectProgress() {
    const results = await this.taskModel.aggregate([
      { $match: { projectId: { $type: 'objectId' } } },
      {
        $group: {
          _id: '$projectId',
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $in: ['$status', ['DONE', 'COMPLETED']] }, 1, 0] } },
          open: { $sum: { $cond: [{ $not: { $in: ['$status', ['DONE', 'COMPLETED']] } }, 1, 0] } },
          active: { $sum: { $cond: [{ $eq: ['$status', 'IN_PROGRESS'] }, 1, 0] } },
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: '_id',
          foreignField: '_id',
          as: 'project',
        },
      },
      { $unwind: '$project' },
      {
        $project: {
          projectId: '$_id',
          name: '$project.name',
          total: 1,
          done: 1,
          open: 1,
          active: 1,
          completionPercent: {
            $cond: [
              { $eq: ['$total', 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ['$done', '$total'] }, 100] }, 0] },
            ],
          },
        },
      },
    ]);
    return results;
  }

  async getProjectDetail(projectId: string) {
    if (!this.isValidObjectId(projectId)) {
      throw new NotFoundException('Project not found');
    }

    const project = await this.projectModel
      .findById(projectId)
      .populate('teamMembers', 'name email')
      .lean();
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const tasks = await this.findAll({ project: projectId });
    const assigneeMap = new Map<
      string,
      {
        userId: string;
        name: string;
        total: number;
        completed: number;
        pending: number;
        inProgress: number;
      }
    >();

    const teamMembers = ((project as any).teamMembers ?? []) as Array<{
      _id: Types.ObjectId;
      name?: string;
      email?: string;
    }>;
    for (const member of teamMembers) {
      const userId = member._id?.toString?.() ?? String(member);
      if (!userId || userId === 'undefined') continue;
      assigneeMap.set(userId, {
        userId,
        name: member.name ?? 'Team member',
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
      });
    }

    const stages = ((project as any).stages ?? []) as Array<{
      key: string;
      label: string;
      color: string;
      order: number;
    }>;
    const stageCounts: Record<string, number> = {};
    for (const stage of stages) {
      stageCounts[stage.key] = 0;
    }

    const stats = { total: 0, completed: 0, pending: 0, inProgress: 0 };

    for (const task of tasks) {
      stats.total += 1;
      const status = task.status;
      if (isDoneStatus(status)) stats.completed += 1;
      else if (status === 'IN_PROGRESS') stats.inProgress += 1;
      else if (status === 'TO_DO' || status === 'PENDING') stats.pending += 1;
      else if (stageCounts[status] !== undefined) stageCounts[status] += 1;
      else stats.pending += 1;

      const userId = (task.assignedTo as any)?._id?.toString() ?? 'unassigned';
      const name = (task.assignedTo as any)?.name ?? 'Unassigned';
      const entry = assigneeMap.get(userId) ?? {
        userId,
        name,
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
      };

      entry.name = name !== 'Unassigned' ? name : entry.name;
      entry.total += 1;
      if (isDoneStatus(status)) entry.completed += 1;
      else if (status === 'IN_PROGRESS') entry.inProgress += 1;
      else entry.pending += 1;

      assigneeMap.set(userId, entry);
    }

    const assignees = Array.from(assigneeMap.values())
      .filter((a) => a.userId !== 'unassigned')
      .sort((a, b) => a.name.localeCompare(b.name));

    // Keep unassigned at end if any tasks lack an assignee
    const unassigned = assigneeMap.get('unassigned');
    if (unassigned && unassigned.total > 0) {
      assignees.push(unassigned);
    }

    return {
      project: {
        _id: project._id,
        name: project.name,
        description: project.description,
        deadline: project.deadline,
        stages,
        teamMembers,
      },
      stats: {
        ...stats,
        stageCounts,
        completionPercent:
          stats.total === 0
            ? 0
            : Math.round((stats.completed / stats.total) * 100),
      },
      assignees,
    };
  }
}
