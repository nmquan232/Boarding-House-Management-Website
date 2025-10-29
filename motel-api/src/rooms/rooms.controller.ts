import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** Lấy danh sách phòng theo apartment */
  @Get(':id/rooms')
  async list(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) apartmentId: number,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('take') take = '10',
  ) {
    return this.roomsService.list(user.userId, apartmentId, q, Number(page), Number(take));
  }

  /** Tạo phòng mới */
  @Post(':id/rooms')
  async create(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) apartmentId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.roomsService.create(user.userId, apartmentId, dto);
  }

  /** Chi tiết phòng */
  @Get('rooms/:roomId')
  async detail(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
  ) {
    return this.roomsService.detail(user.userId, id);
  }

  /** Cập nhật phòng */
  @Put('rooms/:roomId')
  async update(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(user.userId, id, dto);
  }

  /** Xóa phòng */
  @Delete('rooms/:roomId')
  async remove(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
  ) {
    return this.roomsService.remove(user.userId, id);
  }
}
