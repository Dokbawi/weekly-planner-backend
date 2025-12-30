import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WeeklyPlan,
  DailyPlan,
  Task,
  PlanStatus,
  TaskStatus,
} from './schemas/plan.schema';
import {
  CreateWeeklyPlanDto,
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  WeeklyPlanResponseDto,
  TaskResponseDto,
  TodayResponseDto,
} from './dto/plan.dto';
import { ChangelogService } from '../changelog/changelog.service';
import { ChangeType } from '../changelog/schemas/changelog.schema';

@Injectable()
export class PlanService {
  constructor(
    @InjectModel(WeeklyPlan.name) private weeklyPlanModel: Model<WeeklyPlan>,
    private changelogService: ChangelogService,
  ) {}

  async createWeeklyPlan(
    userId: string,
    dto: CreateWeeklyPlanDto,
  ): Promise<WeeklyPlanResponseDto> {
    const weekStartDate = new Date(dto.weekStartDate);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const dailyPlans: DailyPlan[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      dailyPlans.push({
        date: date.toISOString().split('T')[0],
        tasks: [],
      });
    }

    const plan = new this.weeklyPlanModel({
      userId: new Types.ObjectId(userId),
      weekStartDate: dto.weekStartDate,
      weekEndDate: weekEndDate.toISOString().split('T')[0],
      status: PlanStatus.DRAFT,
      dailyPlans,
    });

    const saved = await plan.save();
    return this.toWeeklyPlanResponse(saved);
  }

  async findAllByUser(userId: string, options?: { page?: number; size?: number; status?: string }): Promise<any> {
    const page = options?.page || 0;
    const size = options?.size || 10;

    const query: any = { userId: new Types.ObjectId(userId) };
    if (options?.status) {
      query.status = options.status;
    }

    const totalElements = await this.weeklyPlanModel.countDocuments(query);
    const plans = await this.weeklyPlanModel
      .find(query)
      .sort({ weekStartDate: -1 })
      .skip(page * size)
      .limit(size)
      .exec();

    return {
      content: plans.map((p) => this.toWeeklyPlanResponse(p)),
      page,
      size,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    };
  }

  async getCurrentWeekPlan(userId: string): Promise<WeeklyPlanResponseDto> {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const weekStartDate = startOfWeek.toISOString().split('T')[0];

    let plan = await this.weeklyPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        weekStartDate,
      })
      .exec();

    if (!plan) {
      // 자동 생성
      const dto: CreateWeeklyPlanDto = { weekStartDate };
      return this.createWeeklyPlan(userId, dto);
    }

    return this.toWeeklyPlanResponse(plan);
  }

  async findById(planId: string, userId: string): Promise<WeeklyPlanResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);
    return this.toWeeklyPlanResponse(plan);
  }

  async findByDate(date: string, userId: string): Promise<WeeklyPlanResponseDto | null> {
    const plan = await this.weeklyPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        weekStartDate: { $lte: date },
        weekEndDate: { $gte: date },
      })
      .exec();
    return plan ? this.toWeeklyPlanResponse(plan) : null;
  }

  async confirmPlan(planId: string, userId: string): Promise<WeeklyPlanResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);

    if (plan.status === PlanStatus.CONFIRMED) {
      throw new BadRequestException('Plan is already confirmed');
    }

    plan.status = PlanStatus.CONFIRMED;
    plan.confirmedAt = new Date();
    const saved = await plan.save();
    return this.toWeeklyPlanResponse(saved);
  }

  async addTask(
    planId: string,
    userId: string,
    date: string,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);

    const dailyPlan = plan.dailyPlans.find((dp) => dp.date === date);
    if (!dailyPlan) {
      throw new BadRequestException(`Date ${date} is not in this weekly plan`);
    }

    const task: Task = {
      id: new Types.ObjectId().toString(),
      title: dto.title,
      description: dto.description,
      status: TaskStatus.PENDING,
      priority: dto.priority || 'MEDIUM' as any,
      scheduledTime: dto.scheduledTime,
      reminderMinutesBefore: dto.reminderMinutesBefore ?? 30,
      tags: dto.tags || [],
      createdAt: new Date(),
    };

    dailyPlan.tasks.push(task);
    await plan.save();

    if (plan.status === PlanStatus.CONFIRMED) {
      await this.changelogService.trackChange({
        weeklyPlanId: plan._id.toString(),
        userId,
        targetDate: date,
        taskId: task.id,
        taskTitle: task.title,
        changeType: ChangeType.TASK_CREATED,
        changes: [],
      });
    }

    return this.toTaskResponse(task);
  }

  async updateTask(
    planId: string,
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);
    const { dailyPlan, task, date } = this.findTaskInPlan(plan, taskId);

    const previousTask = { ...task };
    const changes: { field: string; oldValue: any; newValue: any }[] = [];

    if (dto.title !== undefined && dto.title !== task.title) {
      changes.push({ field: 'title', oldValue: task.title, newValue: dto.title });
      task.title = dto.title;
    }
    if (dto.description !== undefined && dto.description !== task.description) {
      changes.push({ field: 'description', oldValue: task.description, newValue: dto.description });
      task.description = dto.description;
    }
    if (dto.status !== undefined && dto.status !== task.status) {
      changes.push({ field: 'status', oldValue: task.status, newValue: dto.status });
      task.status = dto.status;
      if (dto.status === TaskStatus.COMPLETED) {
        task.completedAt = new Date();
      }
    }
    if (dto.priority !== undefined && dto.priority !== task.priority) {
      changes.push({ field: 'priority', oldValue: task.priority, newValue: dto.priority });
      task.priority = dto.priority;
    }
    if (dto.scheduledTime !== undefined && dto.scheduledTime !== task.scheduledTime) {
      changes.push({ field: 'scheduledTime', oldValue: task.scheduledTime, newValue: dto.scheduledTime });
      task.scheduledTime = dto.scheduledTime;
    }
    if (dto.tags !== undefined) {
      changes.push({ field: 'tags', oldValue: task.tags, newValue: dto.tags });
      task.tags = dto.tags;
    }

    await plan.save();

    if (plan.status === PlanStatus.CONFIRMED && changes.length > 0) {
      await this.changelogService.trackChange({
        weeklyPlanId: plan._id.toString(),
        userId,
        targetDate: date,
        taskId: task.id,
        taskTitle: task.title,
        changeType: ChangeType.TASK_UPDATED,
        changes,
        reason: dto.reason,
      });
    }

    return this.toTaskResponse(task);
  }

  async deleteTask(
    planId: string,
    userId: string,
    taskId: string,
    reason?: string,
  ): Promise<void> {
    const plan = await this.findPlanOrThrow(planId, userId);
    const { dailyPlan, task, date } = this.findTaskInPlan(plan, taskId);

    dailyPlan.tasks = dailyPlan.tasks.filter((t) => t.id !== taskId);
    await plan.save();

    if (plan.status === PlanStatus.CONFIRMED) {
      await this.changelogService.trackChange({
        weeklyPlanId: plan._id.toString(),
        userId,
        targetDate: date,
        taskId: task.id,
        taskTitle: task.title,
        changeType: ChangeType.TASK_DELETED,
        changes: [],
        reason,
      });
    }
  }

  async moveTask(
    planId: string,
    userId: string,
    taskId: string,
    dto: MoveTaskDto,
  ): Promise<TaskResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);
    const { dailyPlan: sourceDailyPlan, task, date: sourceDate } = this.findTaskInPlan(plan, taskId);

    const targetDailyPlan = plan.dailyPlans.find((dp) => dp.date === dto.targetDate);
    if (!targetDailyPlan) {
      throw new BadRequestException(`Target date ${dto.targetDate} is not in this weekly plan`);
    }

    // Mark original as postponed
    task.status = TaskStatus.POSTPONED;

    // Create new task in target date
    const newTask: Task = {
      id: new Types.ObjectId().toString(),
      title: task.title,
      description: task.description,
      status: TaskStatus.PENDING,
      priority: task.priority,
      scheduledTime: task.scheduledTime,
      reminderMinutesBefore: task.reminderMinutesBefore,
      tags: task.tags,
      createdAt: new Date(),
    };

    targetDailyPlan.tasks.push(newTask);
    await plan.save();

    if (plan.status === PlanStatus.CONFIRMED) {
      await this.changelogService.trackChange({
        weeklyPlanId: plan._id.toString(),
        userId,
        targetDate: sourceDate,
        taskId: task.id,
        taskTitle: task.title,
        changeType: ChangeType.MOVED_TO_ANOTHER_DAY,
        changes: [{ field: 'movedTo', oldValue: sourceDate, newValue: dto.targetDate }],
        reason: dto.reason || `Moved to ${dto.targetDate}`,
      });
    }

    return this.toTaskResponse(newTask);
  }

  async updateDailyMemo(
    planId: string,
    userId: string,
    date: string,
    memo: string,
  ): Promise<WeeklyPlanResponseDto> {
    const plan = await this.findPlanOrThrow(planId, userId);

    const dailyPlan = plan.dailyPlans.find((dp) => dp.date === date);
    if (!dailyPlan) {
      throw new BadRequestException(`Date ${date} is not in this weekly plan`);
    }

    dailyPlan.memo = memo;
    const saved = await plan.save();

    return this.toWeeklyPlanResponse(saved);
  }

  async getToday(userId: string): Promise<TodayResponseDto> {
    const today = new Date().toISOString().split('T')[0];
    const plan = await this.weeklyPlanModel
      .findOne({
        userId: new Types.ObjectId(userId),
        weekStartDate: { $lte: today },
        weekEndDate: { $gte: today },
      })
      .exec();

    if (!plan) {
      return { date: today, tasks: [] };
    }

    const dailyPlan = plan.dailyPlans.find((dp) => dp.date === today);
    const tasks = dailyPlan?.tasks || [];

    return {
      date: today,
      weeklyPlan: this.toWeeklyPlanResponse(plan),
      tasks: tasks.map((t) => this.toTaskResponse(t)),
    };
  }

  private async findPlanOrThrow(planId: string, userId: string): Promise<WeeklyPlan> {
    const plan = await this.weeklyPlanModel
      .findOne({ _id: new Types.ObjectId(planId), userId: new Types.ObjectId(userId) })
      .exec();
    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }
    return plan;
  }

  private findTaskInPlan(
    plan: WeeklyPlan,
    taskId: string,
  ): { dailyPlan: DailyPlan; task: Task; date: string } {
    for (const dailyPlan of plan.dailyPlans) {
      const task = dailyPlan.tasks.find((t) => t.id === taskId);
      if (task) {
        return { dailyPlan, task, date: dailyPlan.date };
      }
    }
    throw new NotFoundException('Task not found');
  }

  private toWeeklyPlanResponse(plan: WeeklyPlan): WeeklyPlanResponseDto {
    return {
      id: plan._id.toString(),
      userId: plan.userId.toString(),
      weekStartDate: plan.weekStartDate,
      weekEndDate: plan.weekEndDate,
      status: plan.status,
      dailyPlans: plan.dailyPlans.map((dp) => ({
        date: dp.date,
        tasks: dp.tasks.map((t) => this.toTaskResponse(t)),
      })),
      confirmedAt: plan.confirmedAt,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private toTaskResponse(task: Task): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      scheduledTime: task.scheduledTime,
      reminderMinutesBefore: task.reminderMinutesBefore,
      tags: task.tags,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }
}
