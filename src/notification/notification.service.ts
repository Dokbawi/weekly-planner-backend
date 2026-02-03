import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationType } from './schemas/notification.schema';
import { NotificationResponseDto } from './dto/notification.dto';
import { CacheService } from '../changelog/common/cache/cache.service';

const TTL = {
  NOTIFICATIONS: 2 * 60 * 1000, // 2분
  UNREAD_COUNT: 2 * 60 * 1000,  // 2분
};

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    private cacheService: CacheService,
  ) {}

  async create(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    weeklyPlanId?: string;
    taskId?: string;
  }): Promise<Notification> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      message: params.message,
      weeklyPlanId: params.weeklyPlanId
        ? new Types.ObjectId(params.weeklyPlanId)
        : undefined,
      taskId: params.taskId,
      isRead: false,
    });

    const saved = await notification.save();
    await this.invalidateNotificationCache(params.userId);
    return saved;
  }

  async findAllByUser(userId: string): Promise<NotificationResponseDto[]> {
    const cacheKey = `notification:all:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const notifications = await this.notificationModel
          .find({ userId: new Types.ObjectId(userId) })
          .sort({ createdAt: -1 })
          .limit(100)
          .exec();

        return notifications.map((n) => this.toNotificationResponse(n));
      },
      TTL.NOTIFICATIONS,
    );
  }

  async findUnreadByUser(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationModel
      .find({
        userId: new Types.ObjectId(userId),
        isRead: false,
      })
      .sort({ createdAt: -1 })
      .exec();

    return notifications.map((n) => this.toNotificationResponse(n));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = `notification:count:${userId}`;

    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        return this.notificationModel
          .countDocuments({
            userId: new Types.ObjectId(userId),
            isRead: false,
          })
          .exec();
      },
      TTL.UNREAD_COUNT,
    );
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(notificationId),
          userId: new Types.ObjectId(userId),
        },
        {
          isRead: true,
          readAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.invalidateNotificationCache(userId);
    return this.toNotificationResponse(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          isRead: false,
        },
        {
          isRead: true,
          readAt: new Date(),
        },
      )
      .exec();

    await this.invalidateNotificationCache(userId);
  }

  private async invalidateNotificationCache(userId: string): Promise<void> {
    await this.cacheService.delMany([
      `notification:all:${userId}`,
      `notification:count:${userId}`,
    ]);
  }

  private toNotificationResponse(
    notification: Notification,
  ): NotificationResponseDto {
    return {
      id: notification._id.toString(),
      userId: notification.userId.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      weeklyPlanId: notification.weeklyPlanId?.toString(),
      taskId: notification.taskId,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }
}
