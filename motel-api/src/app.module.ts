import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [PrismaModule, AuthModule, ApartmentsModule, UploadsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
