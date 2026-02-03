import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WeeklyPlan, TaskStatus } from '../plan/schemas/plan.schema';
import { ChangeLog, ChangeType } from '../changelog/schemas/changelog.schema';
import { WeeklyReviewResponseDto, ReviewStatisticsDto, DailyBreakdownDto } from './dto/review.dto';
import { CacheService } from '../changelog/common/cache/cache.service';

const TTL = {
  REVIEW: 30 * 60 * 1000, // 30분
};

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(WeeklyPlan.name) private weeklyPlanModel: Model<WeeklyPlan>,
    @InjectModel(ChangeLog.name) private changeLogModel: Model<ChangeLog>,
    private cacheService: CacheService,
  ) {}

  async generateReview(planId: string, userId: string): Promise<WeeklyReviewResponseDto> {
    const cacheKey = `review:${planId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.doGenerateReview(planId, userId),
      TTL.REVIEW,
    );
  }

  private async doGenerateReview(planId: string, userId: string): Promise<WeeklyReviewResponseDto> {
    const plan = await this.weeklyPlanModel
      .findOne({
        _id: new Types.ObjectId(planId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    const changeLogs = await this.changeLogModel
      .find({ weeklyPlanId: new Types.ObjectId(planId) })
      .sort({ changedAt: -1 })
      .exec();

    const allTasks = plan.dailyPlans.flatMap((dp) => dp.tasks);

    const statistics = this.calculateStatistics(allTasks, changeLogs);
    const dailyBreakdown = this.calculateDailyBreakdown(plan);

    return {
      weeklyPlanId: plan._id.toString(),
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      statistics,
      dailyBreakdown,
      changeHistory: changeLogs.map((log) => ({
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
      })),
    };
  }

  private calculateStatistics(
    allTasks: any[],
    changeLogs: ChangeLog[],
  ): ReviewStatisticsDto {
    const totalPlanned = allTasks.length;
    const completed = allTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const cancelled = allTasks.filter(
      (t) => t.status === TaskStatus.CANCELLED,
    ).length;
    const postponed = allTasks.filter(
      (t) => t.status === TaskStatus.POSTPONED,
    ).length;
    const addedAfterConfirm = changeLogs.filter(
      (log) => log.changeType === ChangeType.TASK_CREATED,
    ).length;

    const completableTasks = totalPlanned - cancelled - postponed;
    const completionRate =
      completableTasks > 0
        ? Math.round((completed / completableTasks) * 100)
        : 0;

    const changesByType: Record<string, number> = {};
    for (const log of changeLogs) {
      changesByType[log.changeType] = (changesByType[log.changeType] || 0) + 1;
    }

    return {
      totalPlanned,
      completed,
      cancelled,
      postponed,
      addedAfterConfirm,
      completionRate,
      totalChanges: changeLogs.length,
      changesByType,
    };
  }

  private calculateDailyBreakdown(plan: WeeklyPlan): DailyBreakdownDto[] {
    return plan.dailyPlans.map((dp) => {
      const totalTasks = dp.tasks.length;
      const completed = dp.tasks.filter(
        (t) => t.status === TaskStatus.COMPLETED,
      ).length;
      const cancelled = dp.tasks.filter(
        (t) => t.status === TaskStatus.CANCELLED,
      ).length;
      const postponed = dp.tasks.filter(
        (t) => t.status === TaskStatus.POSTPONED,
      ).length;

      const completableTasks = totalTasks - cancelled - postponed;
      const completionRate =
        completableTasks > 0
          ? Math.round((completed / completableTasks) * 100)
          : 0;

      return {
        date: dp.date,
        totalTasks,
        completed,
        completionRate,
      };
    });
  }
}
