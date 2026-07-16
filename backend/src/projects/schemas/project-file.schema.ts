import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProjectFileDocument = ProjectFile & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'projectdocuments' })
export class ProjectFile {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true, index: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  storedName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId;
}

export const ProjectFileSchema = SchemaFactory.createForClass(ProjectFile);
