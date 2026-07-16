import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({
    required: true,
    enum: ['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE'],
    default: 'EMPLOYEE',
  })
  role: 'ADMIN' | 'HR' | 'PROJECT_MANAGER' | 'TEAM_LEAD' | 'EMPLOYEE';

  @Prop()
  designation?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ select: false })
  resetPasswordToken?: string;

  @Prop({ select: false })
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
