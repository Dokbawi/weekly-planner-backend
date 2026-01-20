import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CommuteStepType {
  PREPARE = 'prepare',
  WALK = 'walk',
  BUS = 'bus',
  SUBWAY = 'subway',
  TAXI = 'taxi',
  CAR = 'car',
  BIKE = 'bike',
  OTHER = 'other',
}

@Schema({ _id: false })
export class CommuteStep {
  @Prop({ type: String, default: () => new Types.ObjectId().toString() })
  id: string;

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  durationMinutes: number;

  @Prop({ type: String, enum: CommuteStepType, default: CommuteStepType.OTHER })
  type: CommuteStepType;

  @Prop({ required: true })
  order: number;
}

export const CommuteStepSchema = SchemaFactory.createForClass(CommuteStep);

@Schema({ timestamps: true, collection: 'commute_routines' })
export class CommuteRoutine extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  destination: string;

  @Prop({ type: [CommuteStepSchema], default: [] })
  steps: CommuteStep[];

  @Prop({ default: 0 })
  totalMinutes: number;

  @Prop()
  defaultArrivalTime?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const CommuteRoutineSchema = SchemaFactory.createForClass(CommuteRoutine);

CommuteRoutineSchema.index({ userId: 1 });
