

import {Body,Controller,Delete,Get,Param,ParseIntPipe,Post,Put,Query,UseGuards,} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class RoomsController {
  constructor(private service: RoomsService) {}

  // GET /apartments/:apartmentId/rooms
  @Get('apartments/:apartmentId/rooms')
  list(
    @User() user: { userId: number },
    @Param('apartmentId', ParseIntPipe) apartmentId: number,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('take') take = '10',
  ) {
    return this.service.list(user.userId, apartmentId, q, Number(page), Number(take));
  }

  // POST /apartments/:apartmentId/rooms
  @Post('apartments/:apartmentId/rooms')
  create(
    @User() user: { userId: number },
    @Param('apartmentId', ParseIntPipe) apartmentId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.service.create(user.userId, apartmentId, dto);
  }

  // GET /rooms/:id
  @Get('rooms/:id')
  detail(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user.userId, id);
  }

  // PUT /rooms/:id
  @Put('rooms/:id')
  update(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  // DELETE /rooms/:id
  @Delete('rooms/:id')
  remove(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.userId, id);
  }
}
