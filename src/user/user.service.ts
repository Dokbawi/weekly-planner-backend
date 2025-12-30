import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, DayOfWeek } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(
    email: string,
    password: string,
    name: string,
  ): Promise<User> {
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      email,
      password: hashedPassword,
      name,
      settings: {
        planningDay: DayOfWeek.SUNDAY,
        reviewDay: DayOfWeek.SATURDAY,
        defaultReminderMinutes: 30,
        timezone: 'Asia/Seoul',
      },
    });

    return user.save();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async findByPlanningDay(dayOfWeek: DayOfWeek): Promise<User[]> {
    return this.userModel
      .find({ 'settings.planningDay': dayOfWeek })
      .exec();
  }

  async findByReviewDay(dayOfWeek: DayOfWeek): Promise<User[]> {
    return this.userModel
      .find({ 'settings.reviewDay': dayOfWeek })
      .exec();
  }

  async updateSettings(userId: string, settings: any): Promise<User | null> {
    const updateData: any = {};

    if (settings.planningDay !== undefined) {
      updateData['settings.planningDay'] = settings.planningDay;
    }
    if (settings.reviewDay !== undefined) {
      updateData['settings.reviewDay'] = settings.reviewDay;
    }
    if (settings.timezone !== undefined) {
      updateData['settings.timezone'] = settings.timezone;
    }
    if (settings.defaultReminderMinutes !== undefined) {
      updateData['settings.defaultReminderMinutes'] = settings.defaultReminderMinutes;
    }
    if (settings.notificationEnabled !== undefined) {
      updateData['settings.notificationEnabled'] = settings.notificationEnabled;
    }

    return this.userModel
      .findByIdAndUpdate(userId, { $set: updateData }, { new: true })
      .exec();
  }
}
