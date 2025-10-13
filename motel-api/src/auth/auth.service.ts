import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';


@Injectable()
export class AuthService {
    constructor(private prisma: PrismaService, private jwt: JwtService) { }

    async register(dto: RegisterDto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new ConflictException('Email đã tồn tại');

        const hash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: { name: dto.name, email: dto.email, password: hash },
        });

        const access_token = await this.signToken(user.id, user.email, user.name);
        return { access_token, user: { id: user.id, name: user.name, email: user.email } };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (!user) throw new UnauthorizedException('Sai email hoặc mật khẩu');

        const ok = await bcrypt.compare(dto.password, user.password);
        if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

        const access_token = await this.signToken(user.id, user.email, user.name);
        return { access_token, user: { id: user.id, name: user.name, email: user.email } };
    }

    private async signToken(sub: number, email: string, name: string) {
        return this.jwt.signAsync(
            { sub, email, name },
            { secret: process.env.JWT_SECRET , expiresIn:( process.env.JWT_EXPIRES_IN  || '7d') as any },
        );
    }
}
