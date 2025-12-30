import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  POSTPONED = 'POSTPONED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
}

@Schema({ _id: false })
export class Task {
  @Prop({ type: String, default: () => new Types.ObjectId().toString() })
  id: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop()
  scheduledTime?: string;

  @Prop({ default: 30 })
  reminderMinutesBefore?: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: () => new Date() })
  createdAt: Date;

  @Prop()
  completedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

@Schema({ _id: false })
export class DailyPlan {
  @Prop({ required: true })
  date: string;

  @Prop({ type: [TaskSchema], default: [] })
  tasks: Task[];

  @Prop()
  memo?: string;
}

export const DailyPlanSchema = SchemaFactory.createForClass(DailyPlan);

@Schema({ timestamps: true, collection: 'weekly_plans' })
export class WeeklyPlan extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  weekStartDate: string;

  @Prop({ required: true })
  weekEndDate: string;

  @Prop({ type: String, enum: PlanStatus, default: PlanStatus.DRAFT })
  status: PlanStatus;

  @Prop({ type: [DailyPlanSchema], default: [] })
  dailyPlans: DailyPlan[];

  @Prop()
  confirmedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const WeeklyPlanSchema = SchemaFactory.createForClass(WeeklyPlan);

WeeklyPlanSchema.index({ userId: 1, weekStartDate: -1 }, { unique: true });
