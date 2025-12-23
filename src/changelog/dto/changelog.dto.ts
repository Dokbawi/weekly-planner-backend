import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeType } from '../schemas/changelog.schema';

export class FieldChangeDto {
  @ApiProperty()
  field: string;

  @ApiProperty({ type: Object })
  oldValue: any;

  @ApiProperty({ type: Object })
  newValue: any;
}

export class ChangeLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  weeklyPlanId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  targetDate: string;

  @ApiProperty()
  taskId: string;

  @ApiProperty()
  taskTitle: string;

  @ApiProperty({ enum: ChangeType })
  changeType: ChangeType;

  @ApiProperty({ type: [FieldChangeDto] })
  changes: FieldChangeDto[];

  @ApiPropertyOptional()
  reason?: string;

  @ApiProperty()
  changedAt: Date;
}

export interface TrackChangeParams {
  weeklyPlanId: string;
  userId: string;
  targetDate: string;
  taskId: string;
  taskTitle: string;
  changeType: ChangeType;
  changes: { field: string; oldValue: any; newValue: any }[];
  reason?: string;
}
