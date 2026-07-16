import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeaveDocument = Leave & Document;

export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'UNPAID';
export type HalfDaySession = 'AM' | 'PM';

@Schema({
  collection: 'leave_requests',
  timestamps: { createdAt: true, updatedAt: false },
})
export class Leave {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employeeId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['CASUAL', 'SICK', 'EARNED', 'UNPAID'],
    default: 'CASUAL',
  })
  leaveType: LeaveType;

  @Prop({ required: true })
  fromDate: Date;

  @Prop({ required: true })
  toDate: Date;

  @Prop({ required: true, min: 0.5 })
  totalDays: number;

  @Prop({ default: false })
  isHalfDay: boolean;

  @Prop({ enum: ['AM', 'PM'] })
  halfDaySession?: HalfDaySession;

  @Prop({
    required: true,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  })
  status: 'Pending' | 'Approved' | 'Rejected';
}

export const LeaveSchema = SchemaFactory.createForClass(Leave);
