import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ _id: false })
export class TaskComment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ _id: false })
export class TaskHistoryEntry {
  @Prop({ required: true })
  action: string;

  @Prop()
  field?: string;

  @Prop()
  oldValue?: string;

  @Prop()
  newValue?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  changedBy?: Types.ObjectId;

  @Prop({ default: Date.now })
  changedAt: Date;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ default: 'MEDIUM', enum: ['HIGH', 'MEDIUM', 'LOW'] })
  priority: 'HIGH' | 'MEDIUM' | 'LOW';

  /** Built-in: TO_DO | IN_PROGRESS | DONE, or a custom project stage key (e.g. QC, TESTING). */
  @Prop({ default: 'TO_DO' })
  status: string;

  @Prop()
  deadline?: Date;

  @Prop({ type: [TaskComment], default: [] })
  comments: TaskComment[];

  @Prop({ type: [TaskHistoryEntry], default: [] })
  history: TaskHistoryEntry[];

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  parentTaskId?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }], default: [] })
  dependsOn: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Milestone' })
  milestoneId?: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
