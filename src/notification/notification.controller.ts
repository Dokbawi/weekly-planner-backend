import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { NotificationResponseDto, UnreadCountResponseDto } from './dto/notification.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/request-with-user.interface';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '전체 알림 목록' })
  async getAllNotifications(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<NotificationResponseDto[]>> {
    const notifications = await this.notificationService.findAllByUser(user.sub);
    return ApiResponse.ok(notifications);
  }

  @Get('unread')
  @ApiOperation({ summary: '읽지 않은 알림' })
  async getUnreadNotifications(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<NotificationResponseDto[]>> {
    const notifications = await this.notificationService.findUnreadByUser(user.sub);
    return ApiResponse.ok(notifications);
  }

  @Get('unread/count')
  @ApiOperation({ summary: '읽지 않은 알림 수' })
  async getUnreadCount(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<UnreadCountResponseDto>> {
    const count = await this.notificationService.getUnreadCount(user.sub);
    return ApiResponse.ok({ count });
  }

  @Post(':notificationId/read')
  @ApiOperation({ summary: '알림 읽음 처리' })
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<ApiResponse<NotificationResponseDto>> {
    const notification = await this.notificationService.markAsRead(
      notificationId,
      user.sub,
    );
    return ApiResponse.ok(notification);
  }

  @Post('read-all')
  @ApiOperation({ summary: '전체 알림 읽음 처리' })
  async markAllAsRead(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiResponse<null>> {
    await this.notificationService.markAllAsRead(user.sub);
    return ApiResponse.ok(null);
  }
}
