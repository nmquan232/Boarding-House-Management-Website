import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly service: ApartmentsService) {}

  @Get()
  list(
    @User() user: { userId: number },
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('take') take = '10',
  ) {
    return this.service.list(user.userId, q, Number(page), Number(take));
  }

  @Post()
  create(@User() user: { userId: number }, @Body() dto: CreateApartmentDto) {
    return this.service.create(user.userId, dto);
  }

  @Get(':id')
  detail(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user.userId, id);
  }

  @Put(':id')
  update(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApartmentDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.userId, id);
  }

  @Get(':id/rooms')
  rooms(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Query('q') q = '',
    @Query('page') page = '1',
    @Query('take') take = '10',
  ) {
    return this.service.getRooms(user.userId, id, q, Number(page), Number(take));
  }
}
