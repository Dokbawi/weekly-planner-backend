import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WeeklyTemplate, TemplateDayPlan, TemplateTask } from './schemas/template.schema';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplateFromPlanDto,
  ApplyMode,
  WeeklyTemplateResponseDto,
} from './dto/template.dto';
import { WeeklyPlan, PlanStatus, Task, TaskStatus } from '../plan/schemas/plan.schema';
import { CacheService } from '../changelog/common/cache/cache.service';

const MAX_TEMPLATES_PER_USER = 20;

const TTL = {
  TEMPLATE_LIST: 10 * 60 * 1000,  // 10분
  TEMPLATE_BY_ID: 15 * 60 * 1000, // 15분
};

@Injectable()
export class TemplateService {
  constructor(
    @InjectModel(WeeklyTemplate.name) private templateModel: Model<WeeklyTemplate>,
    @InjectModel(WeeklyPlan.name) private weeklyPlanModel: Model<WeeklyPlan>,
    private cacheService: CacheService,
  ) {}

  async create(userId: string, dto: CreateTemplateDto): Promise<WeeklyTemplateResponseDto> {
    await this.checkTemplateLimit(userId);

    if (dto.isDefault) {
      await this.clearDefaultTemplate(userId);
    }

    const template = new this.templateModel({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      description: dto.description,
      dayPlans: dto.dayPlans || [],
      isDefault: dto.isDefault || false,
    });

    const saved = await template.save();
    await this.invalidateTemplateCache(userId);
    return this.toResponse(saved);
  }

  async findAll(userId: string): Promise<WeeklyTemplateResponseDto[]> {
    const cacheKey = `template:list:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const templates = await this.templateModel
          .find({ userId: new Types.ObjectId(userId) })
          .sort({ isDefault: -1, updatedAt: -1 })
          .exec();
        return templates.map((t) => this.toResponse(t));
      },
      TTL.TEMPLATE_LIST,
    );
  }

  async findById(id: string, userId: string): Promise<WeeklyTemplateResponseDto> {
    const cacheKey = `template:id:${id}:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const template = await this.findTemplateOrThrow(id, userId);
        return this.toResponse(template);
      },
      TTL.TEMPLATE_BY_ID,
    );
  }

  async update(id: string, userId: string, dto: UpdateTemplateDto): Promise<WeeklyTemplateResponseDto> {
    const template = await this.findTemplateOrThrow(id, userId);

    if (dto.isDefault && !template.isDefault) {
      await this.clearDefaultTemplate(userId);
    }

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.dayPlans !== undefined) template.dayPlans = dto.dayPlans as TemplateDayPlan[];
    if (dto.isDefault !== undefined) template.isDefault = dto.isDefault;

    const saved = await template.save();
    await this.invalidateTemplateCache(userId, id);
    return this.toResponse(saved);
  }

  async delete(id: string, userId: string): Promise<void> {
    const template = await this.findTemplateOrThrow(id, userId);
    await this.templateModel.deleteOne({ _id: template._id });
    await this.invalidateTemplateCache(userId, id);
  }

  async createFromPlan(
    planId: string,
    userId: string,
    dto: CreateTemplateFromPlanDto,
  ): Promise<WeeklyTemplateResponseDto> {
    await this.checkTemplateLimit(userId);

    const plan = await this.weeklyPlanModel
      .findOne({ _id: new Types.ObjectId(planId), userId: new Types.ObjectId(userId) })
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    const dayPlans: TemplateDayPlan[] = plan.dailyPlans.map((dp) => {
      const date = new Date(dp.date);
      return {
        dayOfWeek: date.getDay(),
        tasks: dp.tasks.map((t) => this.toTemplateTask(t)),
      };
    });

    const template = new this.templateModel({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      description: dto.description,
      dayPlans,
      isDefault: false,
    });

    const saved = await template.save();
    await this.invalidateTemplateCache(userId);
    return this.toResponse(saved);
  }

  async applyTemplate(
    planId: string,
    templateId: string,
    userId: string,
    mode: ApplyMode,
  ): Promise<void> {
    const plan = await this.weeklyPlanModel
      .findOne({ _id: new Types.ObjectId(planId), userId: new Types.ObjectId(userId) })
      .exec();

    if (!plan) {
      throw new NotFoundException('Weekly plan not found');
    }

    if (plan.status !== PlanStatus.DRAFT) {
      throw new BadRequestException('Template can only be applied to DRAFT plans');
    }

    const template = await this.findTemplateOrThrow(templateId, userId);

    // Build a map of dayOfWeek -> template tasks
    const templateTasksByDay = new Map<number, TemplateTask[]>();
    for (const dayPlan of template.dayPlans) {
      templateTasksByDay.set(dayPlan.dayOfWeek, dayPlan.tasks);
    }

    for (const dailyPlan of plan.dailyPlans) {
      const date = new Date(dailyPlan.date);
      const dayOfWeek = date.getDay();
      const templateTasks = templateTasksByDay.get(dayOfWeek);

      if (!templateTasks || templateTasks.length === 0) {
        if (mode === ApplyMode.OVERWRITE) {
          dailyPlan.tasks = [];
        }
        continue;
      }

      const newTasks: Task[] = templateTasks.map((tt) => ({
        id: new Types.ObjectId().toString(),
        title: tt.title,
        description: tt.description,
        status: TaskStatus.PENDING,
        priority: tt.priority,
        scheduledTime: tt.scheduledTime,
        reminderMinutesBefore: tt.reminderMinutesBefore ?? 30,
        tags: tt.tags || [],
        createdAt: new Date(),
      }));

      if (mode === ApplyMode.OVERWRITE) {
        dailyPlan.tasks = newTasks;
      } else {
        // merge: append template tasks
        dailyPlan.tasks = [...dailyPlan.tasks, ...newTasks];
      }
    }

    await plan.save();

    // Invalidate plan cache
    const today = new Date().toISOString().split('T')[0];
    await this.cacheService.delMany([
      `plan:current:${userId}`,
      `plan:today:${userId}:${today}`,
      `plan:id:${planId}:${userId}`,
    ]);
  }

  // --- Private helpers ---

  private async checkTemplateLimit(userId: string): Promise<void> {
    const count = await this.templateModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    if (count >= MAX_TEMPLATES_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_TEMPLATES_PER_USER} templates per user allowed`,
      );
    }
  }

  private async clearDefaultTemplate(userId: string): Promise<void> {
    await this.templateModel.updateMany(
      { userId: new Types.ObjectId(userId), isDefault: true },
      { isDefault: false },
    );
  }

  private async findTemplateOrThrow(id: string, userId: string): Promise<WeeklyTemplate> {
    const template = await this.templateModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  private toTemplateTask(task: Task): TemplateTask {
    return {
      title: task.title,
      description: task.description,
      priority: task.priority,
      scheduledTime: task.scheduledTime,
      reminderMinutesBefore: task.reminderMinutesBefore,
      tags: task.tags || [],
    };
  }

  private toResponse(template: WeeklyTemplate): WeeklyTemplateResponseDto {
    return {
      id: template._id.toString(),
      userId: template.userId.toString(),
      name: template.name,
      description: template.description,
      dayPlans: template.dayPlans.map((dp) => ({
        dayOfWeek: dp.dayOfWeek,
        tasks: dp.tasks.map((t) => ({
          title: t.title,
          description: t.description,
          priority: t.priority,
          scheduledTime: t.scheduledTime,
          reminderMinutesBefore: t.reminderMinutesBefore,
          tags: t.tags || [],
        })),
      })),
      isDefault: template.isDefault,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };
  }

  private async invalidateTemplateCache(userId: string, templateId?: string): Promise<void> {
    const keys = [`template:list:${userId}`];
    if (templateId) {
      keys.push(`template:id:${templateId}:${userId}`);
    }
    await this.cacheService.delMany(keys);
  }
}
