import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { UploadsModule } from './uploads/uploads.module';
import { RoomsModule } from './rooms/rooms.module';
import { TenantsModule } from './tenants/tenants.module';
import { ContractsModule } from './contracts/contracts.module';
import { UsagesModule } from './usages/usages.module';

@Module({
  imports: [PrismaModule, AuthModule, ApartmentsModule, UploadsModule, RoomsModule, TenantsModule, ContractsModule, UsagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
