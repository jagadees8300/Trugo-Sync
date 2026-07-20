import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ _id: false })
export class ProjectStage {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  label: string;

  @Prop({ default: '#6366f1' })
  color: string;

  @Prop({ default: 0 })
  order: number;
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  clientName?: string;

  /** Linked client login — only this client sees the project in their portal. */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  clientUserId?: Types.ObjectId;

  @Prop()
  description?: string;

  /** Selected project categories (e.g. Frontend, Backend, UI, QA). */
  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  teamMembers: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  /** Custom kanban stages that appear after Done (e.g. QC, Testing). */
  @Prop({ type: [ProjectStage], default: [] })
  stages: ProjectStage[];

  @Prop({ default: 0, min: 0, max: 100 })
  progress: number;

  @Prop({ default: 0 })
  totalTasks: number;

  @Prop({ default: 0 })
  doneTasks: number;

  @Prop({ default: 0 })
  activeTasks: number;

  @Prop()
  startDate?: Date;

  @Prop()
  deadline?: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
