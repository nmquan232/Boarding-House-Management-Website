import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CollectionsService } from './collections.service';
import { GenerateCollectionDto } from './dto/generate.dto';
import { PayDto } from './dto/pay.dto';

@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private service: CollectionsService) { }

  @Get()
  list(
    @User() user: { userId: number },
    @Query('page') page = '1',
    @Query('take') take = '10',
    @Query('status') status?: 'paid' | 'unpaid' | 'all',
  ) {
    return this.service.list(user.userId, Number(page), Number(take), status || 'all');
  }

  @Post('generate')
  generate(@User() user: { userId: number }, @Body() dto: GenerateCollectionDto) {
    return this.service.generate(user.userId, dto);
  }

  @Get(':id')
  detail(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user.userId, id);
  }

  @Post(':id/pay')
  pay(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayDto,
  ) {
    return this.service.pay(user.userId, id, dto);
  }
}
