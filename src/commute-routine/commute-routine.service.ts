import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CommuteRoutine,
  CommuteStep,
} from './schemas/commute-routine.schema';
import {
  CreateCommuteRoutineDto,
  UpdateCommuteRoutineDto,
  CommuteRoutineResponseDto,
  CalculateResultDto,
  ScheduleItemDto,
} from './dto/commute-routine.dto';
import { CacheService } from '../changelog/common/cache/cache.service';

const TTL = {
  ROUTINE_LIST: 30 * 60 * 1000,  // 30분
  CALCULATE: 24 * 60 * 60 * 1000, // 24시간 (순수 계산)
};

@Injectable()
export class CommuteRoutineService {
  constructor(
    @InjectModel(CommuteRoutine.name)
    private commuteRoutineModel: Model<CommuteRoutine>,
    private cacheService: CacheService,
  ) {}

  async create(
    userId: string,
    dto: CreateCommuteRoutineDto,
  ): Promise<CommuteRoutineResponseDto> {
    const steps = dto.steps.map((step) => ({
      ...step,
      id: new Types.ObjectId().toString(),
    }));

    const totalMinutes = steps.reduce(
      (sum, step) => sum + step.durationMinutes,
      0,
    );

    const routine = new this.commuteRoutineModel({
      userId: new Types.ObjectId(userId),
      name: dto.name,
      destination: dto.destination,
      steps,
      totalMinutes,
      defaultArrivalTime: dto.defaultArrivalTime,
    });

    const saved = await routine.save();
    await this.invalidateCommuteCache(userId);
    return this.toResponseDto(saved);
  }

  async findAll(userId: string): Promise<CommuteRoutineResponseDto[]> {
    const cacheKey = `commute:list:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const routines = await this.commuteRoutineModel
          .find({ userId: new Types.ObjectId(userId) })
          .sort({ createdAt: -1 })
          .exec();

        return routines.map((r) => this.toResponseDto(r));
      },
      TTL.ROUTINE_LIST,
    );
  }

  async findById(
    routineId: string,
    userId: string,
  ): Promise<CommuteRoutineResponseDto> {
    const routine = await this.findRoutineOrThrow(routineId, userId);
    return this.toResponseDto(routine);
  }

  async update(
    routineId: string,
    userId: string,
    dto: UpdateCommuteRoutineDto,
  ): Promise<CommuteRoutineResponseDto> {
    const routine = await this.findRoutineOrThrow(routineId, userId);

    if (dto.name !== undefined) routine.name = dto.name;
    if (dto.destination !== undefined) routine.destination = dto.destination;
    if (dto.defaultArrivalTime !== undefined)
      routine.defaultArrivalTime = dto.defaultArrivalTime;

    if (dto.steps !== undefined) {
      routine.steps = dto.steps.map((step) => ({
        ...step,
        id: new Types.ObjectId().toString(),
      })) as CommuteStep[];
      routine.totalMinutes = routine.steps.reduce(
        (sum, step) => sum + step.durationMinutes,
        0,
      );
    }

    const saved = await routine.save();
    await this.invalidateCommuteCache(userId, routineId);
    return this.toResponseDto(saved);
  }

  async delete(routineId: string, userId: string): Promise<void> {
    const result = await this.commuteRoutineModel.deleteOne({
      _id: new Types.ObjectId(routineId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Commute routine not found');
    }

    await this.invalidateCommuteCache(userId, routineId);
  }

  async calculate(
    routineId: string,
    userId: string,
    arrivalTime: string,
    offsetMinutes: number = 0,
  ): Promise<CalculateResultDto> {
    const cacheKey = `commute:calc:${routineId}:${arrivalTime}:${offsetMinutes}`;

    return this.cacheService.getOrSet(
      cacheKey,
      () => this.doCalculate(routineId, userId, arrivalTime, offsetMinutes),
      TTL.CALCULATE,
    );
  }

  private async doCalculate(
    routineId: string,
    userId: string,
    arrivalTime: string,
    offsetMinutes: number,
  ): Promise<CalculateResultDto> {
    const routine = await this.findRoutineOrThrow(routineId, userId);

    const totalMinutes = routine.totalMinutes + offsetMinutes;
    const [arrivalHour, arrivalMinute] = arrivalTime.split(':').map(Number);
    const arrivalTotalMinutes = arrivalHour * 60 + arrivalMinute;
    const departureTotalMinutes = arrivalTotalMinutes - totalMinutes;

    const departureHour = Math.floor(
      ((departureTotalMinutes % 1440) + 1440) % 1440 / 60,
    );
    const departureMinute = ((departureTotalMinutes % 60) + 60) % 60;
    const departureTime = `${String(departureHour).padStart(2, '0')}:${String(departureMinute).padStart(2, '0')}`;

    // Sort steps by order
    const sortedSteps = [...routine.steps].sort((a, b) => a.order - b.order);

    // Build schedule
    const schedule: ScheduleItemDto[] = [];
    let currentMinutes = departureTotalMinutes;

    for (const step of sortedSteps) {
      const startHour = Math.floor(
        ((currentMinutes % 1440) + 1440) % 1440 / 60,
      );
      const startMinute = ((currentMinutes % 60) + 60) % 60;
      const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;

      currentMinutes += step.durationMinutes;

      const endHour = Math.floor(((currentMinutes % 1440) + 1440) % 1440 / 60);
      const endMinute = ((currentMinutes % 60) + 60) % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

      schedule.push({
        stepId: step.id,
        label: step.label,
        type: step.type,
        startTime,
        endTime,
        durationMinutes: step.durationMinutes,
      });
    }

    return {
      routineId,
      arrivalTime,
      offsetMinutes,
      departureTime,
      totalMinutes,
      schedule,
    };
  }

  private async invalidateCommuteCache(userId: string, routineId?: string): Promise<void> {
    const keys = [`commute:list:${userId}`];
    // Note: calculate 캐시는 routineId 기반이라 정확한 키를 알 수 없으므로
    // TTL에 의존 (24시간). 루틴 수정 시에만 해당 루틴의 캐시를 지움.
    await this.cacheService.delMany(keys);
  }

  private async findRoutineOrThrow(
    routineId: string,
    userId: string,
  ): Promise<CommuteRoutine> {
    const routine = await this.commuteRoutineModel.findOne({
      _id: new Types.ObjectId(routineId),
      userId: new Types.ObjectId(userId),
    });

    if (!routine) {
      throw new NotFoundException('Commute routine not found');
    }

    return routine;
  }

  private toResponseDto(routine: CommuteRoutine): CommuteRoutineResponseDto {
    return {
      id: routine._id.toString(),
      userId: routine.userId.toString(),
      name: routine.name,
      destination: routine.destination,
      steps: routine.steps.map((step) => ({
        id: step.id,
        label: step.label,
        durationMinutes: step.durationMinutes,
        type: step.type,
        order: step.order,
      })),
      totalMinutes: routine.totalMinutes,
      defaultArrivalTime: routine.defaultArrivalTime,
      createdAt: routine.createdAt,
      updatedAt: routine.updatedAt,
    };
  }
}
