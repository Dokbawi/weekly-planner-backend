import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import { TaskStatus, TaskPriority, PlanStatus } from '../schemas/plan.schema';

export class CreateTaskDto {
  @ApiProperty({ example: 'Complete project report' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Finish the quarterly report' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  reminderMinutesBefore?: number;

  @ApiPropertyOptional({ example: ['work', 'important'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 'Updated task title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '15:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  reminderMinutesBefore?: number;

  @ApiPropertyOptional({ example: ['updated', 'tags'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'Reason for change' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class MoveTaskDto {
  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  targetDate: string;

  @ApiPropertyOptional({ example: 'Meeting rescheduled' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateMemoDto {
  @ApiProperty({ example: '2024-01-15', description: '메모를 수정할 날짜' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '오늘의 메모 내용', description: '메모 내용' })
  @IsString()
  memo: string;
}

export class ReorderTasksDto {
  @ApiProperty({ example: '2026-01-19', description: '재정렬할 날짜' })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: ['task-3', 'task-1', 'task-2'],
    description: '정렬된 Task ID 목록',
  })
  @IsArray()
  @IsString({ each: true })
  taskIds: string[];
}

export class CreateWeeklyPlanDto {
  @ApiProperty({ example: '2024-01-14' })
  @IsDateString()
  weekStartDate: string;
}

export class TaskResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TaskStatus })
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional()
  scheduledTime?: string;

  @ApiPropertyOptional()
  reminderMinutesBefore?: number;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  completedAt?: Date;
}

export class DailyPlanResponseDto {
  @ApiProperty()
  date: string;

  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];
}

export class WeeklyPlanResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  weekStartDate: string;

  @ApiProperty()
  weekEndDate: string;

  @ApiProperty({ enum: PlanStatus })
  status: PlanStatus;

  @ApiProperty({ type: [DailyPlanResponseDto] })
  dailyPlans: DailyPlanResponseDto[];

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class TodayResponseDto {
  @ApiProperty()
  date: string;

  @ApiPropertyOptional({ type: WeeklyPlanResponseDto })
  weeklyPlan?: WeeklyPlanResponseDto;

  @ApiProperty({ type: [TaskResponseDto] })
  tasks: TaskResponseDto[];
}
