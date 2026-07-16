import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Leave, LeaveSchema } from '../leave/schemas/leave.schema';
import {
  LeaveBalance,
  LeaveBalanceSchema,
} from '../leave/schemas/leave-balance.schema';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import {
  Milestone,
  MilestoneSchema,
} from '../projects/schemas/milestone.schema';
import {
  AttendanceEntry,
  AttendanceEntrySchema,
} from '../attendance/schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Leave.name, schema: LeaveSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Milestone.name, schema: MilestoneSchema },
      { name: AttendanceEntry.name, schema: AttendanceEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
