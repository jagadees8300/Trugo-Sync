import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import {
  AttendanceEntry,
  AttendanceEntrySchema,
} from './schemas/attendance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { LeaveModule } from '../leave/leave.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    LeaveModule,
    MongooseModule.forFeature([
      { name: AttendanceEntry.name, schema: AttendanceEntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
