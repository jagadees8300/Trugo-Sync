import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type HolidayDocument = Holiday & Document;

@Schema({ collection: 'holidays', timestamps: true })
export class Holiday {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ default: false })
  optional: boolean;
}

export const HolidaySchema = SchemaFactory.createForClass(Holiday);
HolidaySchema.index({ date: 1 }, { unique: true });
