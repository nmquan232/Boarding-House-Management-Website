import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) { }

  /** Chi tiết phòng */
  @Get(':roomId')
  async detail(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
  ) {
    return this.roomsService.detail(user.userId, id);
  }

  /** Cập nhật phòng */
  @Put(':roomId')
  async update(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(user.userId, id, dto);
  }

  /** Xóa phòng */
  @Delete(':roomId')
  async remove(
    @User() user: { userId: number },
    @Param('roomId', ParseIntPipe) id: number,
  ) {
    return this.roomsService.remove(user.userId, id);
  }
}
