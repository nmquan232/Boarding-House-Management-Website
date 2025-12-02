import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';


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

        const access_token = await this.signToken(user.id, user.email, user.name, 'USER');
        return { access_token, user: { id: user.id, name: user.name, email: user.email, role: 'USER' } };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (user) {
            const userWithRole = user as typeof user & { is_admin?: boolean };
            const ok = await bcrypt.compare(dto.password, user.password);
            if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');
            const role: 'USER' | 'ADMIN' = userWithRole.is_admin ? 'ADMIN' : 'USER';
            const access_token = await this.signToken(user.id, user.email, user.name, role);
            return { access_token, user: { id: user.id, name: user.name, email: user.email, role } };
        }

        const admin = await this.prisma.admin.findFirst({
            where: {
                OR: [
                    { email: dto.email },
                    { admin_login_id: dto.email },
                ],
            },
        });
        if (!admin) throw new UnauthorizedException('Sai email hoặc mật khẩu');

        // Type assertion needed until TypeScript picks up regenerated Prisma types
        const adminWithPassword = admin as typeof admin & { password: string };
        const ok = await bcrypt.compare(dto.password, adminWithPassword.password);
        if (!ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

        const access_token = await this.signToken(-admin.id, admin.email ?? admin.admin_login_id, 'Administrator', 'ADMIN');
        return {
            access_token,
            user: {
                id: -admin.id,
                name: 'Administrator',
                email: admin.email ?? admin.admin_login_id,
                role: 'ADMIN',
            },
        };
    }

    async changePassword(userId: number, role: string, dto: ChangePasswordDto) {
        if (role === 'ADMIN') {
            // Admin đổi mật khẩu
            const adminId = Math.abs(userId); // userId của admin là số âm
            const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
            if (!admin) throw new NotFoundException('Admin không tồn tại');

            // Lấy password từ database bằng raw query
            const adminWithPassword = await this.prisma.$queryRaw<Array<{ password: string }>>`
                SELECT password FROM "Admin" WHERE id = ${adminId}
            `;

            if (!adminWithPassword || adminWithPassword.length === 0) {
                throw new NotFoundException('Admin không tồn tại');
            }

            const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, adminWithPassword[0].password);
            if (!isOldPasswordValid) {
                throw new UnauthorizedException('Mật khẩu cũ không đúng');
            }

            const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
            await this.prisma.$executeRaw`
                UPDATE "Admin" SET password = ${newPasswordHash} WHERE id = ${adminId}
            `;

            return { message: 'Đổi mật khẩu thành công' };
        } else {
            // User đổi mật khẩu
            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) throw new NotFoundException('User không tồn tại');

            const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
            if (!isOldPasswordValid) {
                throw new UnauthorizedException('Mật khẩu cũ không đúng');
            }

            if (dto.oldPassword === dto.newPassword) {
                throw new BadRequestException('Mật khẩu mới phải khác mật khẩu cũ');
            }

            const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);
            await this.prisma.user.update({
                where: { id: userId },
                data: { password: newPasswordHash },
            });

            return { message: 'Đổi mật khẩu thành công' };
        }
    }

    private async signToken(sub: number, email: string, name: string, role: 'USER' | 'ADMIN') {
        return this.jwt.signAsync(
            { sub, email, name, role },
            { secret: process.env.JWT_SECRET, expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
        );
    }
}
