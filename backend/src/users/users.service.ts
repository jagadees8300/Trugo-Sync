import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { User } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ALL_APP_ROLES, normalizeRole, type AppRole } from '../auth/auth-user';

const AVATAR_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async onModuleInit() {
    await this.migrateLegacyRoles();
    await this.cleanupSmokeTestUsers();
    await this.seedDefaultUsers();
  }

  /** Remove smoke/test employees only — never delete Hari / Gopi / Jagadeeswaran. */
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

  /** Seed core team: Admin + original employees (Hari, Gopi, Jagadeeswaran). */
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
      {
        name: 'Hariharan',
        email: 'hari@trugosync.com',
        password: 'password',
        role: 'EMPLOYEE',
        designation: 'Senior Field Agent',
      },
      {
        name: 'Gopinath',
        email: 'gopi@trugosync.com',
        password: 'password',
        role: 'EMPLOYEE',
        designation: 'Field Agent',
      },
      {
        name: 'Jagadeeswaran',
        email: 'jagadeeswaran0818@gmail.com',
        password: 'password',
        role: 'EMPLOYEE',
        designation: 'Developer',
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
      .find({ role: { $ne: 'ADMIN' } })
      .select('name email')
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

  async setResetToken(email: string, token: string): Promise<boolean> {
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    const normalized = email.trim().toLowerCase();
    const result = await this.userModel.updateOne(
      { email: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      {
        $set: {
          resetPasswordToken: token,
          resetPasswordExpires: expires,
        },
      },
    );
    return result.matchedCount > 0;
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
}
