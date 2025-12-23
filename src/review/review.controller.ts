import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { WeeklyReviewResponseDto } from './dto/review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/request-with-user.interface';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Weekly Review')
@ApiBearerAuth()
@Controller('plans/:planId/review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Get()
  @ApiOperation({ summary: '주간 회고 생성' })
  async getReview(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
  ): Promise<ApiResponse<WeeklyReviewResponseDto>> {
    const review = await this.reviewService.generateReview(planId, user.sub);
    return ApiResponse.ok(review);
  }
}
