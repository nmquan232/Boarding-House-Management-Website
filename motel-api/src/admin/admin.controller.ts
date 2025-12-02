import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpsertMonthlyCostDto } from './dto/upsert-monthly-cost.dto.js';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { User } from '../common/decorators/user.decorator';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
    constructor(private admin: AdminService) { }

    @Get('users')
    listUsers(
        @Query('page') page = '1',
        @Query('take') take = '10',
        @Query('q') q?: string,
    ) {
        return this.admin.listUsers(Number(page), Number(take), q);
    }

    @Post('users/:id/reset-password')
    resetPassword(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: ResetPasswordDto,
    ) {
        return this.admin.resetUserPassword(id, dto);
    }

    @Put('users/:id/admin')
    updateUserRole(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserRoleDto,
        @User() user: { userId: number },
    ) {
        return this.admin.updateUserAdminRole(id, dto.isAdmin, user.userId);
    }

    @Delete('users/:id')
    removeUser(@Param('id', ParseIntPipe) id: number) {
        return this.admin.removeUser(id);
    }

    @Get('monthly-costs')
    listMonthlyCosts(
        @Query('page') page = '1',
        @Query('take') take = '10',
        @Query('q') q?: string,
    ) {
        return this.admin.listMonthlyCosts(Number(page), Number(take), q);
    }

    @Post('monthly-costs')
    createMonthlyCost(@Body() dto: UpsertMonthlyCostDto) {
        return this.admin.createMonthlyCost(dto);
    }

    @Put('monthly-costs/:id')
    updateMonthlyCost(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpsertMonthlyCostDto,
    ) {
        return this.admin.updateMonthlyCost(id, dto);
    }

    @Delete('monthly-costs/:id')
    deleteMonthlyCost(@Param('id', ParseIntPipe) id: number) {
        return this.admin.deleteMonthlyCost(id);
    }

    @Get('overview')
    overview() {
        return this.admin.overview();
    }

    @Get('rent-chart')
    rentChart(@Query('from') from?: string, @Query('to') to?: string) {
        return this.admin.rentChart(from, to);
    }
}

