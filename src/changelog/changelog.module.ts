import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangeLog, ChangeLogSchema } from './schemas/changelog.schema';
import { ChangelogService } from './changelog.service';
import { ChangelogController } from './changelog.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChangeLog.name, schema: ChangeLogSchema },
    ]),
  ],
  controllers: [ChangelogController],
  providers: [ChangelogService],
  exports: [ChangelogService],
})
export class ChangelogModule {}
