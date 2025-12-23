import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChangeLogResponseDto } from '../../changelog/dto/changelog.dto';

export class ReviewStatisticsDto {
  @ApiProperty()
  totalPlanned: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  postponed: number;

  @ApiProperty()
  addedAfterConfirm: number;

  @ApiProperty()
  completionRate: number;

  @ApiProperty()
  totalChanges: number;

  @ApiProperty({ type: Object })
  changesByType: Record<string, number>;
}

export class DailyBreakdownDto {
  @ApiProperty()
  date: string;

  @ApiProperty()
  totalTasks: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  completionRate: number;
}

export class WeeklyReviewResponseDto {
  @ApiProperty()
  weeklyPlanId: string;

  @ApiProperty()
  weekStartDate: string;

  @ApiProperty()
  weekEndDate: string;

  @ApiProperty({ type: ReviewStatisticsDto })
  statistics: ReviewStatisticsDto;

  @ApiProperty({ type: [DailyBreakdownDto] })
  dailyBreakdown: DailyBreakdownDto[];

  @ApiProperty({ type: [ChangeLogResponseDto] })
  changeHistory: ChangeLogResponseDto[];
}
