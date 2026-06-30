import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: Types.ObjectId;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
