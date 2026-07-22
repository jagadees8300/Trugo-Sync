import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ALL_APP_ROLES, normalizeRole, type AppRole } from '../auth/auth-user';
import { Project } from '../projects/schemas/project.schema';
import { Task } from '../tasks/schemas/task.schema';
import { Milestone } from '../projects/schemas/milestone.schema';
import { Leave } from '../leave/schemas/leave.schema';
import { LeaveBalance } from '../leave/schemas/leave-balance.schema';
import { Notification } from '../notifications/schemas/notification.schema';
import { AttendanceEntry } from '../attendance/schemas/attendance.schema';
import { ProjectFile } from '../projects/schemas/project-file.schema';
import { TaskTimeSession } from '../tasks/schemas/task-time-session.schema';

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Milestone.name) private milestoneModel: Model<Milestone>,
    @InjectModel(Leave.name) private leaveModel: Model<Leave>,
    @InjectModel(LeaveBalance.name) private leaveBalanceModel: Model<LeaveBalance>,
    @InjectModel(Notification.name) private notificationModel: Model<Notification>,
    @InjectModel(AttendanceEntry.name) private attendanceModel: Model<AttendanceEntry>,
    @InjectModel(ProjectFile.name) private projectFileModel: Model<ProjectFile>,
    @InjectModel(TaskTimeSession.name) private taskTimeSessionModel: Model<TaskTimeSession>,
  ) {}

  async onModuleInit() {
    await this.migrateLegacyRoles();
    await this.cleanupSmokeTestUsers();
    await this.cleanupDuplicateUsers();
    await this.seedDefaultUsers();
  }

  /** Remove smoke/test employees created by automated scripts. */
  private async cleanupSmokeTestUsers() {
    const result = await this.userModel.deleteMany({
      $or: [
        { name: 'New Employee' },
        { name: 'Smoke Employee' },
        { email: { $regex: /^newemp\d+@trugosync\.com$/i } },
        { email: { $regex: /^smokeemp\d+@trugosync\.com$/i } },
        { email: { $regex: /^t\d*@t\.com$/i } },
      ],
    });
    if (result.deletedCount > 0) {
      console.log(`Removed ${result.deletedCount} smoke/test user(s) from database`);
    }
  }

  private async migrateLegacyRoles() {
    const users = await this.userModel.find().select('+password').lean();
    for (const user of users) {
      if (typeof user.role === 'object' && user.role !== null) {
        await this.userModel.updateOne(
          { _id: user._id },
          { $set: { role: normalizeRole(user.role) } },
        );
      }
    }
  }

  private normalizeName(name: string) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /** Merge duplicate staff rows by name, keep the oldest row, and rewire refs. */
  private async cleanupDuplicateUsers() {
    const users = await this.userModel
      .find({ role: { $nin: ['ADMIN', 'CLIENT'] } })
      .select('name email role createdAt')
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    const grouped = new Map<string, typeof users>();
    for (const user of users) {
      const key = this.normalizeName(user.name);
      if (!key) continue;
      const existing = grouped.get(key) ?? [];
      existing.push(user);
      grouped.set(key, existing);
    }

    let removedCount = 0;

    for (const [, duplicates] of grouped) {
      if (duplicates.length <= 1) continue;

      const canonical = duplicates[0];
      const duplicateIds = duplicates.slice(1).map((u) => new Types.ObjectId(String(u._id)));
      const canonicalId = new Types.ObjectId(String(canonical._id));

      await this.projectModel.updateMany(
        { createdBy: { $in: duplicateIds } },
        { $set: { createdBy: canonicalId } },
      );
      await this.projectModel.updateMany(
        { clientUserId: { $in: duplicateIds } },
        { $set: { clientUserId: canonicalId } },
      );
      await this.projectModel.updateMany(
        { teamMembers: { $in: duplicateIds } },
        { $addToSet: { teamMembers: canonicalId } },
      );
      await this.projectModel.updateMany(
        { teamMembers: { $in: duplicateIds } },
        { $pull: { teamMembers: { $in: duplicateIds } } as any },
      );

      await this.taskModel.updateMany(
        { assignedTo: { $in: duplicateIds } },
        { $set: { assignedTo: canonicalId } },
      );
      await this.taskModel.updateMany(
        { createdBy: { $in: duplicateIds } },
        { $set: { createdBy: canonicalId } },
      );
      await this.taskModel.updateMany(
        { 'comments.user': { $in: duplicateIds } },
        { $set: { 'comments.$[comment].user': canonicalId } },
        { arrayFilters: [{ 'comment.user': { $in: duplicateIds } }] },
      );
      await this.taskModel.updateMany(
        { 'history.changedBy': { $in: duplicateIds } },
        { $set: { 'history.$[entry].changedBy': canonicalId } },
        { arrayFilters: [{ 'entry.changedBy': { $in: duplicateIds } }] },
      );

      await this.milestoneModel.updateMany(
        { assignees: { $in: duplicateIds } },
        { $addToSet: { assignees: canonicalId } },
      );
      await this.milestoneModel.updateMany(
        { assignees: { $in: duplicateIds } },
        { $pull: { assignees: { $in: duplicateIds } } as any },
      );

      await this.leaveModel.updateMany(
        { employeeId: { $in: duplicateIds } },
        { $set: { employeeId: canonicalId } },
      );
      await this.leaveModel.updateMany(
        { decidedBy: { $in: duplicateIds } },
        { $set: { decidedBy: canonicalId } },
      );
      await this.leaveBalanceModel.updateMany(
        { userId: { $in: duplicateIds } },
        { $set: { userId: canonicalId } },
      );
      await this.notificationModel.updateMany(
        { userId: { $in: duplicateIds } },
        { $set: { userId: canonicalId } },
      );
      await this.notificationModel.updateMany(
        { senderId: { $in: duplicateIds } },
        { $set: { senderId: canonicalId } },
      );
      await this.notificationModel.updateMany(
        { targetUserId: { $in: duplicateIds } },
        { $set: { targetUserId: canonicalId } },
      );
      await this.attendanceModel.updateMany(
        { userId: { $in: duplicateIds } },
        { $set: { userId: canonicalId } },
      );
      await this.projectFileModel.updateMany(
        { uploadedBy: { $in: duplicateIds } },
        { $set: { uploadedBy: canonicalId } },
      );
      await this.taskTimeSessionModel.updateMany(
        { userId: { $in: duplicateIds } },
        { $set: { userId: canonicalId } },
      );

      const result = await this.userModel.deleteMany({ _id: { $in: duplicateIds } });
      removedCount += result.deletedCount ?? 0;
    }

    if (removedCount > 0) {
      console.log(`Removed ${removedCount} duplicate user record(s) from database`);
    }
  }

  /** Seed admin account on first run. */
  private async seedDefaultUsers() {
    await this.userModel.updateOne(
      { email: 'admin@trugosync.com', role: { $ne: 'ADMIN' } },
      { $set: { role: 'ADMIN' } },
    );

    const defaults: Array<{
      name: string;
      email: string;
      password: string;
      role: AppRole;
      designation: string;
    }> = [
      {
        name: 'Admin',
        email: 'admin@trugosync.com',
        password: 'password',
        role: 'ADMIN',
        designation: 'Administrator',
      },
    ];

    for (const user of defaults) {
      const exists = await this.userModel.findOne({ email: user.email });
      if (!exists) {
        const salt = await bcrypt.genSalt();
        const hashedPassword = await bcrypt.hash(user.password, salt);
        await this.userModel.create({
          name: user.name,
          email: user.email,
          password: hashedPassword,
          role: user.role,
          designation: user.designation,
        });
        console.log(`Seeded user: ${user.email}`);
      } else if (!exists.role || typeof exists.role === 'object') {
        await this.userModel.updateOne(
          { _id: exists._id },
          { $set: { role: user.role, designation: user.designation } },
        );
      }
    }
  }

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    try {
      const createdUser = await this.userModel.create({
        name: createUserDto.name.trim(),
        email,
        password: hashedPassword,
        role: createUserDto.role && ALL_APP_ROLES.includes(createUserDto.role)
          ? createUserDto.role
          : 'EMPLOYEE',
        designation: createUserDto.designation?.trim() || undefined,
      });

      return {
        message: 'Employee created successfully',
        user: {
          _id: createdUser._id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          designation: createdUser.designation,
        },
      };
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async findAssignees(): Promise<Array<{ _id: string; name: string; email: string }>> {
    const users = await this.userModel
      .find({ role: { $nin: ['ADMIN', 'CLIENT'] } })
      .select('name email')
      .sort({ name: 1 })
      .collation({ locale: 'en', strength: 2 })
      .lean();
    return users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
    }));
  }

  async findClients(): Promise<Array<{ _id: string; name: string; email: string }>> {
    const users = await this.userModel
      .find({ role: 'CLIENT' })
      .select('name email')
      .sort({ name: 1 })
      .collation({ locale: 'en', strength: 2 })
      .lean();
    return users.map((u) => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
    }));
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async updateProfile(
    userId: string,
    data: { name?: string; designation?: string },
    file?: Express.Multer.File,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.name?.trim()) {
      user.name = data.name.trim();
    }
    if (data.designation !== undefined) {
      user.designation = data.designation.trim();
    }

    if (file) {
      if (!AVATAR_MIME.has(file.mimetype)) {
        throw new BadRequestException('Avatar must be JPEG, PNG, GIF, or WebP');
      }
      if (file.size > MAX_AVATAR_SIZE) {
        throw new BadRequestException('Avatar must be 5MB or smaller');
      }

      const dir = join(process.cwd(), 'uploads', 'avatars');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      if (user.avatarUrl?.startsWith('/uploads/avatars/')) {
        const oldPath = join(process.cwd(), user.avatarUrl.replace(/^\//, ''));
        if (existsSync(oldPath)) {
          unlinkSync(oldPath);
        }
      }

      const safeExt = extname(file.originalname).slice(0, 10) || '.jpg';
      const storedName = `${userId}-${Date.now()}${safeExt}`;
      writeFileSync(join(dir, storedName), file.buffer);
      user.avatarUrl = `/uploads/avatars/${storedName}`;
    }

    await user.save();
    return this.userModel.findById(userId).select('-password').lean().exec();
  }

  async login(loginDto: LoginDto): Promise<any> {
    const email = loginDto.email.trim().toLowerCase();
    const { password } = loginDto;
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await this.userModel
      .findOne({ email: new RegExp(`^${escaped}$`, 'i') })
      .select('+password')
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userObj = user.toObject();
    const { password: _pw, ...safeUser } = userObj;

    return {
      message: 'Login successful',
      user: {
        id: safeUser._id,
        _id: safeUser._id,
        name: safeUser.name,
        email: safeUser.email,
        role: safeUser.role,
        designation: safeUser.designation,
        avatarUrl: safeUser.avatarUrl,
      },
    };
  }

  async setResetToken(
    email: string,
    token: string,
  ): Promise<{ ok: boolean; email?: string }> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    const normalized = email.trim().toLowerCase();
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const user = await this.userModel
      .findOne({ email: new RegExp(`^${escaped}$`, 'i') })
      .select('email')
      .lean();

    if (!user?.email) {
      return { ok: false };
    }

    await this.userModel.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        },
      },
    );
    return { ok: true, email: user.email };
  }

  async findByResetToken(token: string) {
    const normalized = token.trim();
    return this.userModel
      .findOne({
        resetPasswordToken: normalized,
        resetPasswordExpires: { $gt: new Date() },
      })
      .select('+resetPasswordToken +resetPasswordExpires')
      .lean();
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const normalized = token.trim();
    const user = await this.userModel
      .findOne({
        resetPasswordToken: normalized,
        resetPasswordExpires: { $gt: new Date() },
      })
      .select('+password +resetPasswordToken +resetPasswordExpires');

    if (!user) {
      throw new UnauthorizedException(
        'This reset link was already used or has expired. Please login with your new password, or request a new link.',
      );
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.set('resetPasswordToken', undefined);
    user.set('resetPasswordExpires', undefined);
    await user.save();
    return true;
  }

  /** Delete a team member (admin only). Cleans related refs; blocks ADMIN / self-delete. */
  async remove(userId: string, requesterId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user id');
    }
    if (userId === requesterId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = normalizeRole(user.role);
    if (role === 'ADMIN') {
      throw new BadRequestException('Admin accounts cannot be deleted');
    }

    const oid = new Types.ObjectId(userId);

    await this.projectModel.updateMany(
      { teamMembers: oid },
      { $pull: { teamMembers: oid } },
    );
    await this.projectModel.updateMany(
      { clientUserId: oid },
      { $unset: { clientUserId: 1 } },
    );
    await this.projectModel.updateMany(
      { createdBy: oid },
      { $unset: { createdBy: 1 } },
    );

    await this.taskModel.updateMany(
      { assignedTo: oid },
      { $unset: { assignedTo: 1 } },
    );
    await this.taskModel.updateMany(
      { createdBy: oid },
      { $unset: { createdBy: 1 } },
    );

    await this.milestoneModel.updateMany(
      { assignees: oid },
      { $pull: { assignees: oid } },
    );

    await this.leaveModel.deleteMany({ employeeId: oid });
    await this.leaveBalanceModel.deleteMany({ userId: oid });
    await this.attendanceModel.deleteMany({ userId: oid });
    await this.taskTimeSessionModel.deleteMany({ userId: oid });
    await this.notificationModel.deleteMany({
      $or: [{ userId: oid }, { senderId: oid }, { targetUserId: oid }],
    });
    await this.projectFileModel.updateMany(
      { uploadedBy: oid },
      { $unset: { uploadedBy: 1 } },
    );

    await this.userModel.findByIdAndDelete(oid);

    return {
      message: 'Team member deleted successfully',
      id: userId,
      name: user.name,
    };
  }
}
