import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChangelogService } from './changelog.service';
import { ChangeLogResponseDto } from './dto/changelog.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/request-with-user.interface';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Change Logs')
@ApiBearerAuth()
@Controller('plans/:planId/changes')
export class ChangelogController {
  constructor(private changelogService: ChangelogService) {}

  @Get()
  @ApiOperation({ summary: '전체 변경 이력' })
  async getChanges(
    @Param('planId') planId: string,
  ): Promise<ApiResponse<ChangeLogResponseDto[]>> {
    const changes = await this.changelogService.findByPlanId(planId);
    return ApiResponse.ok(changes);
  }

  @Get('by-date')
  @ApiOperation({ summary: '특정 날짜 변경 이력' })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15' })
  async getChangesByDate(
    @Param('planId') planId: string,
    @Query('date') date: string,
  ): Promise<ApiResponse<ChangeLogResponseDto[]>> {
    const changes = await this.changelogService.findByPlanIdAndDate(planId, date);
    return ApiResponse.ok(changes);
  }
}
