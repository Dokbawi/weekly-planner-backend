import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CommuteStepType } from '../schemas/commute-routine.schema';

export class CreateCommuteStepDto {
  @ApiProperty({ example: '준비' })
  @IsString()
  label: string;

  @ApiProperty({ example: 30 })
  @IsNumber()
  @Min(1)
  durationMinutes: number;

  @ApiProperty({ enum: CommuteStepType, example: 'prepare' })
  @IsEnum(CommuteStepType)
  type: CommuteStepType;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  order: number;
}

export class CreateCommuteRoutineDto {
  @ApiProperty({ example: '출근 루틴' })
  @IsString()
  name: string;

  @ApiProperty({ example: '회사' })
  @IsString()
  destination: string;

  @ApiProperty({ type: [CreateCommuteStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommuteStepDto)
  steps: CreateCommuteStepDto[];

  @ApiPropertyOptional({ example: '09:00', description: '기본 도착 시간 (HH:mm)' })
  @IsOptional()
  @IsString()
  defaultArrivalTime?: string;
}

export class UpdateCommuteRoutineDto {
  @ApiPropertyOptional({ example: '출근 루틴 수정' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '회사' })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiPropertyOptional({ type: [CreateCommuteStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCommuteStepDto)
  steps?: CreateCommuteStepDto[];

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @IsString()
  defaultArrivalTime?: string;
}

export class CalculateDepartureDto {
  @ApiProperty({ example: '09:00', description: '도착 시간 (HH:mm)' })
  @IsString()
  arrivalTime: string;

  @ApiPropertyOptional({ example: 10, description: '여유 시간 (분)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offsetMinutes?: number;
}

export class AddToTasksDto {
  @ApiProperty({ example: '2026-01-20', description: '추가할 날짜' })
  @IsString()
  date: string;

  @ApiProperty({ example: '09:00', description: '도착 시간 (HH:mm)' })
  @IsString()
  arrivalTime: string;

  @ApiPropertyOptional({ example: 10, description: '여유 시간 (분)', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offsetMinutes?: number;
}

// Response DTOs
export class CommuteStepResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  label: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ enum: CommuteStepType })
  type: CommuteStepType;

  @ApiProperty()
  order: number;
}

export class CommuteRoutineResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  destination: string;

  @ApiProperty({ type: [CommuteStepResponseDto] })
  steps: CommuteStepResponseDto[];

  @ApiProperty()
  totalMinutes: number;

  @ApiPropertyOptional()
  defaultArrivalTime?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ScheduleItemDto {
  @ApiProperty()
  stepId: string;

  @ApiProperty()
  label: string;

  @ApiProperty({ enum: CommuteStepType })
  type: CommuteStepType;

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  durationMinutes: number;
}

export class CalculateResultDto {
  @ApiProperty()
  routineId: string;

  @ApiProperty()
  arrivalTime: string;

  @ApiProperty()
  offsetMinutes: number;

  @ApiProperty()
  departureTime: string;

  @ApiProperty()
  totalMinutes: number;

  @ApiProperty({ type: [ScheduleItemDto] })
  schedule: ScheduleItemDto[];
}
