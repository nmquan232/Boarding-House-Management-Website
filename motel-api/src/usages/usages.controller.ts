import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { UsagesService } from './usages.service';
import { CreateUsageDto } from './dto/create-usage.dto';
import { ListUsageQuery } from './dto/list-usage.query';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId')
export class UsagesController {
  constructor(private service: UsagesService) {}

  // ---------- Electricity ----------
  @Post('electricity-usages')
  addElectricity(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: CreateUsageDto,
  ) {
    return this.service.addElectricityUsage(user.userId, roomId, dto.usage_number, dto.input_date);
  }

  @Get('electricity-usages')
  listElectricity(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() q: ListUsageQuery,
  ) {
    return this.service.listElectricity(
      user.userId,
      roomId,
      q.from,
      q.to,
      q.page ?? 1,
      q.take ?? 10,
    );
  }

  // ---------- Water ----------
  @Post('water-usages')
  addWater(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: CreateUsageDto,
  ) {
    return this.service.addWaterUsage(user.userId, roomId, dto.usage_number, dto.input_date);
  }

  @Get('water-usages')
  listWater(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) roomId: number,
    @Query() q: ListUsageQuery,
  ) {
    return this.service.listWater(
      user.userId,
      roomId,
      q.from,
      q.to,
      q.page ?? 1,
      q.take ?? 10,
    );
  }
}
