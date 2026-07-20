import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createReadStream, existsSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { ProjectFile, ProjectFileDocument } from './schemas/project-file.schema';
import { Milestone, MilestoneDocument } from './schemas/milestone.schema';
import { Task, TaskDocument } from '../tasks/schemas/task.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { TasksService } from '../tasks/tasks.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isDoneStatus, stageKeyFromName } from '../tasks/task-status.util';
import type { AuthUser } from '../auth/auth-user';
import { isAdmin, isElevated, canManageProject, isClient } from '../auth/auth-user';

const STAGE_COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

@Injectable()
export class ProjectsService implements OnModuleInit {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(ProjectFile.name) private projectFileModel: Model<ProjectFileDocument>,
    @InjectModel(Milestone.name) private milestoneModel: Model<MilestoneDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private tasksService: TasksService,
    private notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.cleanupSmokeTestProjects();
  }

  /** Remove API smoke/test projects and their related tasks/files/milestones. */
  private async cleanupSmokeTestProjects() {
    const smokeProjects = await this.projectModel
      .find({
        $or: [
          { name: { $regex: /^Smoke Project/i } },
          { name: { $regex: /^API Test Project/i } },
          { clientName: { $regex: /^Smoke Client/i } },
          { description: { $regex: /^API smoke$/i } },
        ],
      })
      .select('_id')
      .lean();

    if (smokeProjects.length === 0) return;

    const ids = smokeProjects.map((p) => p._id);
    const taskResult = await this.taskModel.deleteMany({ projectId: { $in: ids } });
    await this.milestoneModel.deleteMany({ projectId: { $in: ids } });
    await this.projectFileModel.deleteMany({ projectId: { $in: ids } });
    const projectResult = await this.projectModel.deleteMany({ _id: { $in: ids } });

    console.log(
      `Removed ${projectResult.deletedCount} smoke/test project(s) and ${taskResult.deletedCount} related task(s)`,
    );
  }

  private uploadsRoot() {
    return join(process.cwd(), 'uploads', 'projects');
  }

  private projectUploadsDir(projectId: string) {
    return join(this.uploadsRoot(), projectId);
  }

  private async getAccessibleProject(projectId: string, requester: AuthUser) {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');
    this.assertProjectAccess(project, requester);
    return project;
  }

  private employeeProjectFilter(userId: string) {
    const oid = new Types.ObjectId(userId);
    return {
      $or: [{ teamMembers: oid }, { createdBy: oid }, { clientUserId: oid }],
    };
  }

  private clientProjectFilter(userId: string) {
    return { clientUserId: new Types.ObjectId(userId) };
  }

  private refId(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const obj = value as { _id?: unknown; toString?: () => string };
      if (obj._id != null) return String(obj._id);
      if (typeof obj.toString === 'function') {
        const s = obj.toString();
        if (s && s !== '[object Object]') return s;
      }
    }
    return String(value);
  }

  private canAccessProject(project: ProjectDocument, userId: string): boolean {
    if (this.refId(project.createdBy) === userId) return true;
    if (this.refId(project.clientUserId) === userId) return true;
    return (project.teamMembers ?? []).some((m) => this.refId(m) === userId);
  }

  private assertProjectAccess(project: ProjectDocument, requester: AuthUser) {
    if (isElevated(requester)) return;
    if (isClient(requester)) {
      if (this.refId(project.clientUserId) !== requester.userId) {
        throw new ForbiddenException('Access denied');
      }
      return;
    }
    if (!this.canAccessProject(project, requester.userId)) {
      throw new ForbiddenException('Access denied');
    }
  }

  private async enrichProject(project: ProjectDocument) {
    const projectObj = project.toObject();
    const projectId = projectObj._id;
    const tasks = Types.ObjectId.isValid(projectId)
      ? await this.taskModel
          .find({ projectId: new Types.ObjectId(projectId.toString()) })
          .lean()
      : [];
    const total = tasks.length;
    const done = tasks.filter((t) => isDoneStatus(t.status)).length;
    const active = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    return {
      ...projectObj,
      stages: projectObj.stages ?? [],
      progress,
      totalTasks: total,
      doneTasks: done,
      activeTasks: active,
      completionPercent: progress,
    };
  }

  async create(createProjectDto: CreateProjectDto, userId?: string): Promise<Project> {
    const data: Record<string, unknown> = { ...createProjectDto, stages: [] };
    if (createProjectDto.startDate) {
      data.startDate = new Date(createProjectDto.startDate);
    }
    if (createProjectDto.deadline) {
      data.deadline = new Date(createProjectDto.deadline);
    }
    if (
      createProjectDto.clientUserId &&
      Types.ObjectId.isValid(createProjectDto.clientUserId)
    ) {
      data.clientUserId = new Types.ObjectId(createProjectDto.clientUserId);
    } else {
      delete data.clientUserId;
    }
    if (userId && Types.ObjectId.isValid(userId)) {
      data.createdBy = new Types.ObjectId(userId);
      const members = new Set(
        (createProjectDto.teamMembers ?? []).map((id) => id.toString()),
      );
      members.add(userId);
      data.teamMembers = Array.from(members).map((id) => new Types.ObjectId(id));
    }
    const createdProject = new this.projectModel(data);
    const saved = await createdProject.save();
    return this.enrichProject(saved);
  }

  async findAll(requester?: AuthUser): Promise<Project[]> {
    let query: Record<string, unknown> = {};
    if (requester && isClient(requester)) {
      query = this.clientProjectFilter(requester.userId);
    } else if (requester && !isElevated(requester)) {
      query = this.employeeProjectFilter(requester.userId);
    }
    const projects = await this.projectModel
      .find(query)
      .populate('teamMembers', '-password')
      .populate('clientUserId', 'name email role')
      .exec();
    return Promise.all(projects.map((p) => this.enrichProject(p)));
  }

  async findOne(id: string, requester?: AuthUser) {
    const project = await this.projectModel
      .findById(id)
      .populate('teamMembers', '-password')
      .populate('clientUserId', 'name email role')
      .exec();
    if (!project) throw new NotFoundException('Project not found');
    if (requester) this.assertProjectAccess(project, requester);

    const enriched = await this.enrichProject(project);
    const tasks = await this.tasksService.findAll({ project: id }, requester);
    return { ...enriched, tasks };
  }

  async getDetail(projectId: string, requester: AuthUser) {
    await this.getAccessibleProject(projectId, requester);
    const detail = await this.tasksService.getProjectDetail(projectId);
    const tasks = await this.tasksService.findAll({ project: projectId }, requester);
    const milestones = await this.findMilestonesForRequester(projectId, requester);
    return { ...detail, tasks, milestones };
  }

  private async findMilestonesForRequester(projectId: string, requester: AuthUser) {
    if (!Types.ObjectId.isValid(projectId)) return [];
    const milestones = await this.milestoneModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('assignees', 'name email')
      .sort({ dueDate: 1 })
      .lean();
    if (isElevated(requester)) return milestones;
    const uid = requester.userId;
    return milestones.filter((m) => {
      const assignees = (m.assignees ?? []) as Array<
        { _id?: Types.ObjectId } | Types.ObjectId | string
      >;
      // Empty assignees: not auto-shared — only manually mentioned employees see it
      if (assignees.length === 0) return false;
      return assignees.some((a) => {
        if (typeof a === 'string') return a === uid;
        if (a && typeof a === 'object' && '_id' in a && a._id) {
          return a._id.toString() === uid;
        }
        return a?.toString?.() === uid;
      });
    });
  }

  async addStage(projectId: string, dto: CreateStageDto) {
    const project = await this.projectModel.findById(projectId);
    if (!project) throw new NotFoundException('Project not found');

    const key = stageKeyFromName(dto.name);
    if (!key) {
      throw new BadRequestException('Stage name is invalid');
    }

    const reserved = ['TO_DO', 'IN_PROGRESS', 'DONE', 'PENDING', 'COMPLETED', 'ALL'];
    if (reserved.includes(key)) {
      throw new BadRequestException(`"${dto.name}" is a built-in stage and cannot be recreated`);
    }

    const existing = project.stages ?? [];
    if (existing.some((s) => s.key === key)) {
      throw new BadRequestException(`Stage "${dto.name}" already exists on this project`);
    }

    const color = dto.color || STAGE_COLORS[existing.length % STAGE_COLORS.length];
    const stage = {
      key,
      label: dto.name.trim(),
      color,
      order: existing.length,
    };

    project.stages = [...existing, stage];
    await project.save();
    return this.enrichProject(project);
  }

  async update(id: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    const data: Record<string, unknown> = { ...updateProjectDto };
    if (updateProjectDto.startDate) {
      data.startDate = new Date(updateProjectDto.startDate);
    }
    if (updateProjectDto.deadline) {
      data.deadline = new Date(updateProjectDto.deadline);
    }
    if (updateProjectDto.clientUserId !== undefined) {
      if (
        updateProjectDto.clientUserId &&
        Types.ObjectId.isValid(updateProjectDto.clientUserId)
      ) {
        data.clientUserId = new Types.ObjectId(updateProjectDto.clientUserId);
      } else {
        data.clientUserId = null;
      }
    }
    if (updateProjectDto.teamMembers !== undefined) {
      data.teamMembers = (updateProjectDto.teamMembers ?? [])
        .filter((id) => Types.ObjectId.isValid(id))
        .map((id) => new Types.ObjectId(id));
    }
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
    if (!updatedProject) throw new NotFoundException('Project not found');
    return this.enrichProject(updatedProject);
  }

  async remove(id: string): Promise<{ message: string; project: Project }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    const oid = new Types.ObjectId(id);
    await this.taskModel.deleteMany({ projectId: oid });
    await this.milestoneModel.deleteMany({ projectId: oid });
    await this.projectFileModel.deleteMany({ projectId: oid });

    const uploadsDir = this.projectUploadsDir(id);
    if (existsSync(uploadsDir)) {
      rmSync(uploadsDir, { recursive: true, force: true });
    }

    await project.deleteOne();
    return { message: 'Project deleted', project };
  }

  async uploadDocument(
    projectId: string,
    file: Express.Multer.File | undefined,
    requester: AuthUser,
  ) {
    const project = await this.getAccessibleProject(projectId, requester);

    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File must be 10MB or smaller');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        'File type not allowed. Use PDF, images, Word, Excel, text, or ZIP.',
      );
    }

    const dir = this.projectUploadsDir(projectId);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const safeExt = extname(file.originalname).slice(0, 20);
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;
    const absolutePath = join(dir, storedName);

    writeFileSync(absolutePath, file.buffer);

    const doc = await this.projectFileModel.create({
      projectId: new Types.ObjectId(projectId),
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: new Types.ObjectId(requester.userId),
    });

    if (isClient(requester)) {
      const projectLabel = project.name || 'project';
      const msg = `Client uploaded "${file.originalname}" on ${projectLabel}`;
      try {
        await this.notificationsService.notifyRoles(['ADMIN'], {
          message: msg,
          type: 'DOCUMENT_UPLOADED',
          senderId: requester.userId,
          excludeUserId: requester.userId,
        });
        const memberIds = (project.teamMembers ?? [])
          .map((m) => this.refId(m))
          .filter((id) => id && id !== requester.userId);
        for (const memberId of memberIds) {
          await this.notificationsService.create({
            userId: memberId,
            message: msg,
            type: 'DOCUMENT_UPLOADED',
            senderId: requester.userId,
          });
        }
      } catch (err) {
        console.error('Failed to notify team about client document upload', err);
      }
    }

    return this.projectFileModel
      .findById(doc._id)
      .populate('uploadedBy', 'name email role')
      .lean()
      .exec();
  }

  async listDocuments(projectId: string, requester: AuthUser) {
    await this.getAccessibleProject(projectId, requester);
    return this.projectFileModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async getDocumentFile(
    projectId: string,
    docId: string,
    requester: AuthUser,
  ) {
    await this.getAccessibleProject(projectId, requester);

    const doc = await this.projectFileModel.findById(docId).exec();
    if (!doc || doc.projectId.toString() !== projectId) {
      throw new NotFoundException('Document not found');
    }

    const absolutePath = join(this.projectUploadsDir(projectId), doc.storedName);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException('File missing on server');
    }

    return {
      stream: createReadStream(absolutePath),
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      size: doc.size,
    };
  }

  async deleteDocument(projectId: string, docId: string, requester: AuthUser) {
    if (!canManageProject(requester)) {
      throw new ForbiddenException('Not allowed to delete documents');
    }
    await this.getAccessibleProject(projectId, requester);

    const doc = await this.projectFileModel.findById(docId).exec();
    if (!doc || doc.projectId.toString() !== projectId) {
      throw new NotFoundException('Document not found');
    }

    const absolutePath = join(this.projectUploadsDir(projectId), doc.storedName);
    if (existsSync(absolutePath)) {
      unlinkSync(absolutePath);
    }

    await doc.deleteOne();
    return { message: 'Document deleted' };
  }

  async listMilestones(projectId: string, requester: AuthUser) {
    await this.getAccessibleProject(projectId, requester);
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }
    return this.findMilestonesForRequester(projectId, requester);
  }

  async createMilestone(
    projectId: string,
    dto: CreateMilestoneDto,
    requester: AuthUser,
  ) {
    const project = await this.getAccessibleProject(projectId, requester);
    if (!canManageProject(requester) && requester.role !== 'TEAM_LEAD') {
      throw new ForbiddenException('Not allowed to create milestones');
    }
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project id');
    }

    const teamIds = new Set(
      (project.teamMembers ?? []).map((m) => m.toString()),
    );
    const assigneeIds = (dto.assigneeIds ?? []).filter((id) =>
      Types.ObjectId.isValid(id),
    );
    if (assigneeIds.length === 0) {
      throw new BadRequestException('Mention at least one employee');
    }
    for (const id of assigneeIds) {
      if (!teamIds.has(id)) {
        throw new BadRequestException(
          'Milestone assignees must be project team members',
        );
      }
    }

    const created = await this.milestoneModel.create({
      projectId: new Types.ObjectId(projectId),
      title: dto.title.trim(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      status: dto.status ?? 'PENDING',
      assignees: assigneeIds.map((id) => new Types.ObjectId(id)),
    });
    return this.milestoneModel
      .findById(created._id)
      .populate('assignees', 'name email')
      .lean();
  }

  async deleteMilestone(projectId: string, milestoneId: string, requester: AuthUser) {
    await this.getAccessibleProject(projectId, requester);
    if (!canManageProject(requester) && !isAdmin(requester)) {
      throw new ForbiddenException('Not allowed to delete milestones');
    }
    if (!Types.ObjectId.isValid(projectId) || !Types.ObjectId.isValid(milestoneId)) {
      throw new BadRequestException('Invalid id');
    }
    const deleted = await this.milestoneModel.findOneAndDelete({
      _id: new Types.ObjectId(milestoneId),
      projectId: new Types.ObjectId(projectId),
    });
    if (!deleted) throw new NotFoundException('Milestone not found');
    await this.taskModel.updateMany(
      { milestoneId: deleted._id },
      { $unset: { milestoneId: 1 } },
    );
    return { message: 'Milestone deleted' };
  }
}
