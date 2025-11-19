import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) { }

  /** Lấy danh sách tenant IDs thuộc user thông qua apartments */
  private async getTenantIdsByUser(userId: number): Promise<number[]> {
    const apartments = await this.prisma.apartment.findMany({
      where: { user_id: userId },
      select: { id: true },
    });
    const apartmentIds = apartments.map((a) => a.id);

    if (apartmentIds.length === 0) return [];

    const rooms = await this.prisma.apartmentRoom.findMany({
      where: { apartment_id: { in: apartmentIds } },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);

    if (roomIds.length === 0) return [];

    const contracts = await this.prisma.tenantContract.findMany({
      where: { apartment_room_id: { in: roomIds } },
      select: { tenant_id: true },
      distinct: ['tenant_id'],
    });

    return contracts.map((c) => c.tenant_id);
  }

  /** Kiểm tra tenant có thuộc user không */
  private async ensureTenantOwnedByUser(tenantId: number, userId: number) {
    const tenantIds = await this.getTenantIdsByUser(userId);
    if (!tenantIds.includes(tenantId)) {
      throw new ForbiddenException('Bạn không có quyền truy cập tenant này');
    }
  }

  async list(userId: number, q?: string, page = 1, take = 10) {
    const tenantIds = await this.getTenantIdsByUser(userId);

    if (tenantIds.length === 0) {
      return { items: [], total: 0, page, take, pages: 0 };
    }

    const where: Prisma.TenantWhereInput = {
      id: { in: tenantIds },
      ...(q
        ? {
          OR: [
            { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { tel: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
            { identity_card_number: { contains: q, mode: Prisma.QueryMode.insensitive } },
          ],
        }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  create(userId: number, dto: CreateTenantDto) {
    // Tạo tenant mới (không cần kiểm tra user vì tenant mới chưa có contract)
    return this.prisma.tenant.create({ data: dto });
  }

  async detail(userId: number, id: number) {
    await this.ensureTenantOwnedByUser(id, userId);
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async update(userId: number, id: number, dto: UpdateTenantDto) {
    await this.ensureTenantOwnedByUser(id, userId);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async remove(userId: number, id: number) {
    await this.ensureTenantOwnedByUser(id, userId);
    await this.prisma.tenant.delete({ where: { id } });
    return { ok: true };
  }
}
