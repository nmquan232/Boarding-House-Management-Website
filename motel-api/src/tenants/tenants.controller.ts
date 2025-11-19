import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private service: TenantsService) { }

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
  create(@User() user: { userId: number }, @Body() dto: CreateTenantDto) {
    return this.service.create(user.userId, dto);
  }

  @Get(':id')
  detail(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.detail(user.userId, id);
  }

  @Put(':id')
  update(
    @User() user: { userId: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.service.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@User() user: { userId: number }, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(user.userId, id);
  }
}
