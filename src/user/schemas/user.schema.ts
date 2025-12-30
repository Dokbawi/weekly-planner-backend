import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

@Schema({ _id: false })
export class UserSettings {
  @Prop({ type: Number, enum: DayOfWeek, default: DayOfWeek.SUNDAY })
  planningDay: DayOfWeek;

  @Prop({ type: Number, enum: DayOfWeek, default: DayOfWeek.SATURDAY })
  reviewDay: DayOfWeek;

  @Prop({ default: 30 })
  defaultReminderMinutes: number;

  @Prop({ default: 'Asia/Seoul' })
  timezone: string;

  @Prop({ default: true })
  notificationEnabled: boolean;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);

@Schema({ timestamps: true, collection: 'users' })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: UserSettingsSchema, default: () => ({}) })
  settings: UserSettings;

  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });
