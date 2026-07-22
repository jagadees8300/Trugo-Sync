import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceEntryDocument = AttendanceEntry & Document;

@Schema({ _id: false })
export class AttendancePauseSegment {
  @Prop({ required: true })
  pausedAt: Date;

  @Prop()
  resumedAt?: Date;

  @Prop()
  reason?: string;
}

@Schema({ collection: 'attendance_entries', timestamps: true })
export class AttendanceEntry {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** Calendar day as UTC midnight */
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  clockIn: Date;

  @Prop()
  clockOut?: Date;

  @Prop()
  note?: string;

  @Prop()
  clockInLatitude?: number;

  @Prop()
  clockInLongitude?: number;

  @Prop()
  clockInDistanceMeters?: number;

  @Prop({ enum: ['OFFICE', 'WFH'], default: 'OFFICE' })
  workMode?: 'OFFICE' | 'WFH';

  @Prop({ enum: ['WORKING', 'PAUSED', 'COMPLETED'], default: 'WORKING' })
  status?: 'WORKING' | 'PAUSED' | 'COMPLETED';

  @Prop({ type: [AttendancePauseSegment], default: [] })
  pauseSegments?: AttendancePauseSegment[];
}

export const AttendanceEntrySchema = SchemaFactory.createForClass(AttendanceEntry);
AttendanceEntrySchema.index({ userId: 1, date: 1 });
