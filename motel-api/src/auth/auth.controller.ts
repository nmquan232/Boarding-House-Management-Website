import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) { }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@User() user: { userId: number; email: string; name: string; role: string }) {
    return { user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @User() user: { userId: number; email: string; name: string; role: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.auth.changePassword(user.userId, user.role, dto);
  }
}
