import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import type { LeaveType } from './leave.schema';

export type LeaveBalanceDocument = LeaveBalance & Document;

@Schema({ collection: 'leave_balances', timestamps: true })
export class LeaveBalance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  year: number;

  @Prop({
    required: true,
    enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID'],
  })
  leaveType: LeaveType;

  @Prop({ required: true, default: 0, min: 0 })
  allocated: number;

  @Prop({ required: true, default: 0, min: 0 })
  used: number;
}

export const LeaveBalanceSchema = SchemaFactory.createForClass(LeaveBalance);
LeaveBalanceSchema.index({ userId: 1, year: 1, leaveType: 1 }, { unique: true });
