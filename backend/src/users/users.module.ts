import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Milestone, MilestoneSchema } from '../projects/schemas/milestone.schema';
import { Leave, LeaveSchema } from '../leave/schemas/leave.schema';
import { LeaveBalance, LeaveBalanceSchema } from '../leave/schemas/leave-balance.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';
import { AttendanceEntry, AttendanceEntrySchema } from '../attendance/schemas/attendance.schema';
import { ProjectFile, ProjectFileSchema } from '../projects/schemas/project-file.schema';
import {
  TaskTimeSession,
  TaskTimeSessionSchema,
} from '../tasks/schemas/task-time-session.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: Leave.name, schema: LeaveSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: AttendanceEntry.name, schema: AttendanceEntrySchema },
      { name: ProjectFile.name, schema: ProjectFileSchema },
      { name: TaskTimeSession.name, schema: TaskTimeSessionSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
