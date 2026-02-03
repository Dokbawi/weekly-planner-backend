import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TaskPriority } from '../../plan/schemas/plan.schema';

@Schema({ _id: false })
export class TemplateTask {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: TaskPriority, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop()
  scheduledTime?: string;

  @Prop({ default: 30 })
  reminderMinutesBefore?: number;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const TemplateTaskSchema = SchemaFactory.createForClass(TemplateTask);

@Schema({ _id: false })
export class TemplateDayPlan {
  @Prop({ required: true, enum: [0, 1, 2, 3, 4, 5, 6] })
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday

  @Prop({ type: [TemplateTaskSchema], default: [] })
  tasks: TemplateTask[];
}

export const TemplateDayPlanSchema = SchemaFactory.createForClass(TemplateDayPlan);

@Schema({ timestamps: true, collection: 'weekly_templates' })
export class WeeklyTemplate extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [TemplateDayPlanSchema], default: [] })
  dayPlans: TemplateDayPlan[];

  @Prop({ default: false })
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const WeeklyTemplateSchema = SchemaFactory.createForClass(WeeklyTemplate);

WeeklyTemplateSchema.index({ userId: 1 });
WeeklyTemplateSchema.index({ userId: 1, isDefault: 1 });
