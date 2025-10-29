import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ApartmentsService],
  controllers: [ApartmentsController]
})
export class ApartmentsModule {}

