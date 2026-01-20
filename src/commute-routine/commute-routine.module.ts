import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommuteRoutineService } from './commute-routine.service';
import { CommuteRoutineController } from './commute-routine.controller';
import {
  CommuteRoutine,
  CommuteRoutineSchema,
} from './schemas/commute-routine.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommuteRoutine.name, schema: CommuteRoutineSchema },
    ]),
  ],
  providers: [CommuteRoutineService],
  controllers: [CommuteRoutineController],
  exports: [CommuteRoutineService],
})
export class CommuteRoutineModule {}
