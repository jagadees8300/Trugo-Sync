import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceEntryDocument = AttendanceEntry & Document;

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
}

export const AttendanceEntrySchema = SchemaFactory.createForClass(AttendanceEntry);
AttendanceEntrySchema.index({ userId: 1, date: 1 });
