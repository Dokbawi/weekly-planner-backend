import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
  IsNumber,
  ValidateNested,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '../../plan/schemas/plan.schema';

export class TemplateTaskDto {
  @ApiProperty({ example: 'Morning standup' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Daily team sync' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;

  @ApiPropertyOptional({ example: ['work', 'meeting'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class TemplateDayPlanDto {
  @ApiProperty({ example: 1, description: '요일 (0=일, 1=월, ..., 6=토)' })
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ type: [TemplateTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateTaskDto)
  tasks: TemplateTaskDto[];
}

export class CreateTemplateDto {
  @ApiProperty({ example: '업무 주간 기본' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '평일 업무 + 주말 운동 패턴' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [TemplateDayPlanDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateDayPlanDto)
  dayPlans?: TemplateDayPlanDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: '업무 주간 기본 v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '수정된 설명' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [TemplateDayPlanDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateDayPlanDto)
  dayPlans?: TemplateDayPlanDto[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CreateTemplateFromPlanDto {
  @ApiProperty({ example: '이번 주 패턴' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '현재 주간 일정을 템플릿으로 저장' })
  @IsOptional()
  @IsString()
  description?: string;
}

export enum ApplyMode {
  OVERWRITE = 'overwrite',
  MERGE = 'merge',
}

export class ApplyTemplateDto {
  @ApiProperty({ enum: ApplyMode, default: ApplyMode.OVERWRITE })
  @IsEnum(ApplyMode)
  mode: ApplyMode;
}

// Response DTOs

export class TemplateTaskResponseDto {
  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ enum: TaskPriority })
  priority: TaskPriority;

  @ApiPropertyOptional()
  scheduledTime?: string;

  @ApiPropertyOptional()
  reminderMinutesBefore?: number;

  @ApiProperty({ type: [String] })
  tags: string[];
}

export class TemplateDayPlanResponseDto {
  @ApiProperty()
  dayOfWeek: number;

  @ApiProperty({ type: [TemplateTaskResponseDto] })
  tasks: TemplateTaskResponseDto[];
}

export class WeeklyTemplateResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [TemplateDayPlanResponseDto] })
  dayPlans: TemplateDayPlanResponseDto[];

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
