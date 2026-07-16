import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveController } from './leave.controller';
import { LeaveService } from './leave.service';
import { Leave, LeaveSchema } from './schemas/leave.schema';
import { LeaveBalance, LeaveBalanceSchema } from './schemas/leave-balance.schema';
import { Holiday, HolidaySchema } from './schemas/holiday.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Leave.name, schema: LeaveSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: Holiday.name, schema: HolidaySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
