import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationType } from './schemas/notification.schema';
import { NotificationResponseDto } from './dto/notification.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
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

    return notification.save();
  }

  async findAllByUser(userId: string): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    return notifications.map((n) => this.toNotificationResponse(n));
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
    return this.notificationModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
      })
      .exec();
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
