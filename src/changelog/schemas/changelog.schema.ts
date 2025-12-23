import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ChangeType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_DELETED = 'TASK_DELETED',
  MOVED_TO_ANOTHER_DAY = 'MOVED_TO_ANOTHER_DAY',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

@Schema({ _id: false })
export class FieldChange {
  @Prop({ required: true })
  field: string;

  @Prop({ type: Object })
  oldValue: any;

  @Prop({ type: Object })
  newValue: any;
}

export const FieldChangeSchema = SchemaFactory.createForClass(FieldChange);

@Schema({ timestamps: true, collection: 'change_logs' })
export class ChangeLog extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'WeeklyPlan' })
  weeklyPlanId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  targetDate: string;

  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true })
  taskTitle: string;

  @Prop({ type: String, enum: ChangeType, required: true })
  changeType: ChangeType;

  @Prop({ type: [FieldChangeSchema], default: [] })
  changes: FieldChange[];

  @Prop()
  reason?: string;

  @Prop({ default: () => new Date() })
  changedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ChangeLogSchema = SchemaFactory.createForClass(ChangeLog);

ChangeLogSchema.index({ weeklyPlanId: 1, changedAt: -1 });
ChangeLogSchema.index({ userId: 1, changedAt: -1 });
