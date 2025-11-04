// usages.controller.ts
import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { UsagesService } from './usages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('usages')
export class UsagesController {
  constructor(private service: UsagesService) {}

  // Preview tính tiền theo tháng
  @Get('rooms/:roomId/preview-month')
  previewMonth(
    @User() user: { userId: number },
    @Param('roomId') roomId: string,
    @Query('month') month: string, // "YYYY-MM"
  ) {
    return this.service.calcChargeForMonth(user.userId, Number(roomId), month);
  }

  // Preview tính tiền theo khoảng ngày
  @Get('rooms/:roomId/preview-period')
  previewPeriod(
    @User() user: { userId: number },
    @Param('roomId') roomId: string,
    @Query('start') start: string, // ISO
    @Query('end') end: string,     // ISO
  ) {
    return this.service.calcChargeForPeriod(user.userId, Number(roomId), new Date(start), new Date(end));
  }
}
