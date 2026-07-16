import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'OVERDUE'
  | 'COMMENT_ADDED'
  | 'LEAVE_SUBMITTED';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  /** Who sent / triggered this notification (admin, commenter, etc.) */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  senderId?: Types.ObjectId;

  /** Who the action targets (e.g. task assignee) — shown as "To:" in UI */
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  targetUserId?: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  readStatus: boolean;

  @Prop({
    required: true,
    enum: ['TASK_ASSIGNED', 'OVERDUE', 'COMMENT_ADDED', 'LEAVE_SUBMITTED'],
  })
  type: NotificationType;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
