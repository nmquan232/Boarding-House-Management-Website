import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private service: ContractsService) {}

  @Get()
  list(@User() user: { userId: number }, @Query('page') page = '1', @Query('take') take = '10') {
    return this.service.list(user.userId, Number(page), Number(take));
  }

  @Post()
  create(@User() user: { userId: number }, @Body() dto: CreateContractDto) {
    return this.service.create(user.userId, dto);
  }

  @Get(':id')
  detail(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user.userId, id);
  }

  @Put(':id')
  update(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateContractDto) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.userId, id);
  }
}
