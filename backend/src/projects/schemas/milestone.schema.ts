import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MilestoneDocument = Milestone & Document;

@Schema({ collection: 'milestones', timestamps: true })
export class Milestone {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop()
  dueDate?: Date;

  @Prop({
    enum: ['PENDING', 'IN_PROGRESS', 'DONE'],
    default: 'PENDING',
  })
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';

  /** Manually mentioned employees only (no automatic all-team visibility). */
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  assignees: Types.ObjectId[];
}

export const MilestoneSchema = SchemaFactory.createForClass(Milestone);
