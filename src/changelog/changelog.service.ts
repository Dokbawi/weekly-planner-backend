import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChangeLog } from './schemas/changelog.schema';
import { ChangeLogResponseDto, TrackChangeParams } from './dto/changelog.dto';

@Injectable()
export class ChangelogService {
  constructor(
    @InjectModel(ChangeLog.name) private changeLogModel: Model<ChangeLog>,
  ) {}

  async trackChange(params: TrackChangeParams): Promise<ChangeLog> {
    const changeLog = new this.changeLogModel({
      weeklyPlanId: new Types.ObjectId(params.weeklyPlanId),
      userId: new Types.ObjectId(params.userId),
      targetDate: params.targetDate,
      taskId: params.taskId,
      taskTitle: params.taskTitle,
      changeType: params.changeType,
      changes: params.changes,
      reason: params.reason,
      changedAt: new Date(),
    });

    return changeLog.save();
  }

  async findByPlanId(planId: string): Promise<ChangeLogResponseDto[]> {
    const logs = await this.changeLogModel
      .find({ weeklyPlanId: new Types.ObjectId(planId) })
      .sort({ changedAt: -1 })
      .exec();

    return logs.map((log) => this.toChangeLogResponse(log));
  }

  async findByPlanIdAndDate(
    planId: string,
    date: string,
  ): Promise<ChangeLogResponseDto[]> {
    const logs = await this.changeLogModel
      .find({
        weeklyPlanId: new Types.ObjectId(planId),
        targetDate: date,
      })
      .sort({ changedAt: -1 })
      .exec();

    return logs.map((log) => this.toChangeLogResponse(log));
  }

  async findByUserId(userId: string): Promise<ChangeLogResponseDto[]> {
    const logs = await this.changeLogModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ changedAt: -1 })
      .limit(100)
      .exec();

    return logs.map((log) => this.toChangeLogResponse(log));
  }

  private toChangeLogResponse(log: ChangeLog): ChangeLogResponseDto {
    return {
      id: log._id.toString(),
      weeklyPlanId: log.weeklyPlanId.toString(),
      userId: log.userId.toString(),
      targetDate: log.targetDate,
      taskId: log.taskId,
      taskTitle: log.taskTitle,
      changeType: log.changeType,
      changes: log.changes.map((c) => ({
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
      })),
      reason: log.reason,
      changedAt: log.changedAt,
    };
  }
}
