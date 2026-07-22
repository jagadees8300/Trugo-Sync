import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskTimeSessionDocument = TaskTimeSession & Document;

@Schema({ _id: false })
export class TimeSegment {
  @Prop({ required: true })
  startedAt: Date;

  /** Set when paused or stopped. Missing = currently running. */
  @Prop()
  endedAt?: Date;
}

@Schema({ collection: 'task_time_sessions', timestamps: true })
export class TaskTimeSession {
  @Prop({ type: Types.ObjectId, ref: 'Task', required: true, index: true })
  taskId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['RUNNING', 'PAUSED', 'STOPPED'],
    default: 'PAUSED',
  })
  status: 'RUNNING' | 'PAUSED' | 'STOPPED';

  @Prop({ type: [TimeSegment], default: [] })
  segments: TimeSegment[];
}

export const TaskTimeSessionSchema = SchemaFactory.createForClass(TaskTimeSession);
TaskTimeSessionSchema.index({ taskId: 1, userId: 1 }, { unique: true });
TaskTimeSessionSchema.index({ userId: 1, status: 1 });
