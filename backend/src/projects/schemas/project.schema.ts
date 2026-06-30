import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  teamMembers: Types.ObjectId[];

  @Prop()
  deadline: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
