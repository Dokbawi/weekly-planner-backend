import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationService } from './notification.service';
import { NotificationType } from './schemas/notification.schema';
import { WeeklyPlan, PlanStatus, TaskStatus } from '../plan/schemas/plan.schema';
import { User, DayOfWeek } from '../user/schemas/user.schema';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private notificationService: NotificationService,
    @InjectModel(WeeklyPlan.name) private weeklyPlanModel: Model<WeeklyPlan>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  // 매 분 실행 - Task 알림 체크
  @Cron(CronExpression.EVERY_MINUTE)
  async checkTaskReminders() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    try {
      const plans = await this.weeklyPlanModel
        .find({
          status: PlanStatus.CONFIRMED,
          weekStartDate: { $lte: today },
          weekEndDate: { $gte: today },
        })
        .exec();

      for (const plan of plans) {
        const dailyPlan = plan.dailyPlans.find((dp) => dp.date === today);
        if (!dailyPlan) continue;

        for (const task of dailyPlan.tasks) {
          if (
            task.status === TaskStatus.PENDING &&
            task.scheduledTime &&
            task.reminderMinutesBefore
          ) {
            const reminderTime = this.calculateReminderTime(
              task.scheduledTime,
              task.reminderMinutesBefore,
            );
            if (reminderTime === currentTime) {
              await this.notificationService.create({
                userId: plan.userId.toString(),
                type: NotificationType.TASK_REMINDER,
                title: '할 일 알림',
                message: `"${task.title}" 시작 ${task.reminderMinutesBefore}분 전입니다.`,
                weeklyPlanId: plan._id.toString(),
                taskId: task.id,
              });
              this.logger.log(`Task reminder sent for task: ${task.title}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking task reminders', error);
    }
  }

  // 매일 08:00 - 오늘 할 일 요약
  @Cron('0 0 8 * * *')
  async sendDailySummary() {
    const today = new Date().toISOString().split('T')[0];

    try {
      const plans = await this.weeklyPlanModel
        .find({
          status: PlanStatus.CONFIRMED,
          weekStartDate: { $lte: today },
          weekEndDate: { $gte: today },
        })
        .exec();

      for (const plan of plans) {
        const dailyPlan = plan.dailyPlans.find((dp) => dp.date === today);
        if (!dailyPlan || dailyPlan.tasks.length === 0) continue;

        const pendingTasks = dailyPlan.tasks.filter(
          (t) => t.status === TaskStatus.PENDING,
        );

        if (pendingTasks.length > 0) {
          await this.notificationService.create({
            userId: plan.userId.toString(),
            type: NotificationType.DAILY_SUMMARY,
            title: '오늘의 할 일',
            message: `오늘 완료해야 할 ${pendingTasks.length}개의 할 일이 있습니다.`,
            weeklyPlanId: plan._id.toString(),
          });
          this.logger.log(`Daily summary sent for user: ${plan.userId}`);
        }
      }
    } catch (error) {
      this.logger.error('Error sending daily summary', error);
    }
  }

  // 매일 09:00 - 계획 수립 알림 (planningDay인 사용자)
  @Cron('0 0 9 * * *')
  async sendPlanningReminder() {
    const today = new Date();
    const dayOfWeek = today.getDay() as DayOfWeek;

    try {
      const users = await this.userModel
        .find({ 'settings.planningDay': dayOfWeek })
        .exec();

      for (const user of users) {
        const todayStr = today.toISOString().split('T')[0];
        const existingPlan = await this.weeklyPlanModel
          .findOne({
            userId: user._id,
            weekStartDate: { $lte: todayStr },
            weekEndDate: { $gte: todayStr },
            status: PlanStatus.DRAFT,
          })
          .exec();

        if (existingPlan) {
          await this.notificationService.create({
            userId: user._id.toString(),
            type: NotificationType.PLANNING_REMINDER,
            title: '주간 계획 수립',
            message: '이번 주 계획이 아직 확정되지 않았습니다. 계획을 확정해주세요.',
            weeklyPlanId: existingPlan._id.toString(),
          });
          this.logger.log(`Planning reminder sent for user: ${user._id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error sending planning reminder', error);
    }
  }

  // 매일 18:00 - 회고 알림 (reviewDay인 사용자)
  @Cron('0 0 18 * * *')
  async sendReviewReminder() {
    const today = new Date();
    const dayOfWeek = today.getDay() as DayOfWeek;

    try {
      const users = await this.userModel
        .find({ 'settings.reviewDay': dayOfWeek })
        .exec();

      for (const user of users) {
        const todayStr = today.toISOString().split('T')[0];
        const existingPlan = await this.weeklyPlanModel
          .findOne({
            userId: user._id,
            weekStartDate: { $lte: todayStr },
            weekEndDate: { $gte: todayStr },
            status: PlanStatus.CONFIRMED,
          })
          .exec();

        if (existingPlan) {
          await this.notificationService.create({
            userId: user._id.toString(),
            type: NotificationType.REVIEW_REMINDER,
            title: '주간 회고',
            message: '이번 주를 돌아보고 회고를 작성해보세요.',
            weeklyPlanId: existingPlan._id.toString(),
          });
          this.logger.log(`Review reminder sent for user: ${user._id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error sending review reminder', error);
    }
  }

  private calculateReminderTime(
    scheduledTime: string,
    minutesBefore: number,
  ): string {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes - minutesBefore;
    const reminderHours = Math.floor(totalMinutes / 60);
    const reminderMinutes = totalMinutes % 60;
    return `${reminderHours.toString().padStart(2, '0')}:${reminderMinutes.toString().padStart(2, '0')}`;
  }
}
