import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { SearchContractDto } from './dto/search-contract.dto';

@UseGuards(JwtAuthGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private service: ContractsService) {}

  @Get()
  list(
    @User() user: { userId: number },
    @Query() q: SearchContractDto,   // dùng DTO để nhận q, page, take, tenant_id
  ) {
    const { q: keyword, page = 1, take = 10, tenant_id } = q || {};
    return this.service.list(
      user.userId,
      keyword,
      Number(page),
      Number(take),
      typeof tenant_id === 'number' ? tenant_id : undefined,
    );
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
