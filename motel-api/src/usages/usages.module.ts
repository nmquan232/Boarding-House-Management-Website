import { Module } from '@nestjs/common';
import { UsagesController } from './usages.controller';
import { UsagesService } from './usages.service';

@Module({
  controllers: [UsagesController],
  providers: [UsagesService],
  exports: [UsagesService],
})
export class UsagesModule {}
