import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { WeeklyPlan, WeeklyPlanSchema } from '../plan/schemas/plan.schema';
import { ChangeLog, ChangeLogSchema } from '../changelog/schemas/changelog.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WeeklyPlan.name, schema: WeeklyPlanSchema },
      { name: ChangeLog.name, schema: ChangeLogSchema },
    ]),
  ],
  controllers: [ReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
