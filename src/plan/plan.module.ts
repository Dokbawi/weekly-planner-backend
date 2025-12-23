import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeeklyPlan, WeeklyPlanSchema } from './schemas/plan.schema';
import { PlanService } from './plan.service';
import { PlanController, TodayController } from './plan.controller';
import { ChangelogModule } from '../changelog/changelog.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WeeklyPlan.name, schema: WeeklyPlanSchema },
    ]),
    forwardRef(() => ChangelogModule),
  ],
  controllers: [PlanController, TodayController],
  providers: [PlanService],
  exports: [PlanService, MongooseModule],
})
export class PlanModule {}
