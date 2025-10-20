import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async list(q?: string, page = 1, take = 10) {
    const where = q ? {
      OR: [
        { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { tel: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { identity_card_number: { contains: q, mode: Prisma.QueryMode.insensitive } },
      ],
    } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where, orderBy: { id: 'desc' }, skip: (page - 1) * take, take,
      }),
      this.prisma.tenant.count({ where }),
    ]);
    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({ data: dto });
  }

  async detail(id: number) {
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async update(id: number, dto: UpdateTenantDto) {
    await this.detail(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.detail(id);
    await this.prisma.tenant.delete({ where: { id } });
    return { ok: true };
  }
}
