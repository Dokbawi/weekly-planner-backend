import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeeklyTemplate, WeeklyTemplateSchema } from './schemas/template.schema';
import { TemplateService } from './template.service';
import { TemplateController, ApplyTemplateController } from './template.controller';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WeeklyTemplate.name, schema: WeeklyTemplateSchema },
    ]),
    PlanModule,
  ],
  controllers: [TemplateController, ApplyTemplateController],
  providers: [TemplateService],
  exports: [TemplateService],
})
export class TemplateModule {}
