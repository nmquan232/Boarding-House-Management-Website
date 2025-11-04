import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApartmentsService {
  constructor(private prisma: PrismaService) {}

  /** Giới hạn take để tránh query quá nặng */
  private sanitizePaging(page?: number, take?: number) {
    const _page = Math.max(1, Number(page || 1));
    const rawTake = Number(take || 10);
    const _take = Math.min(Math.max(1, rawTake), 100); // 1..100
    return { page: _page, take: _take, skip: (_page - 1) * _take };
  }

  /** Đảm bảo apartment thuộc user */
  private async ensureApartmentOwnedByUser(apartmentId: number, userId: number) {
    const apt = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, user_id: userId },
      select: { id: true },
    });
    if (!apt) throw new ForbiddenException('Apartment không thuộc quyền của bạn hoặc không tồn tại');
  }

  async list(userId: number, q?: string, page = 1, take = 10) {
    const { page: _page, take: _take, skip } = this.sanitizePaging(page, take);

    const where: Prisma.ApartmentWhereInput = {
      user_id: userId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
              { address: { contains: q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.apartment.findMany({
        where,
        skip,
        take: _take,
        orderBy: { id: 'desc' },
      }),
      this.prisma.apartment.count({ where }),
    ]);

    return {
      items,
      total,
      page: _page,
      take: _take,
      pages: Math.max(1, Math.ceil(total / _take)),
    };
  }

  async create(userId: number, dto: CreateApartmentDto) {
    if (!dto.name?.trim() || !dto.address?.trim()) {
      throw new BadRequestException('Tên và địa chỉ là bắt buộc');
    }
    return this.prisma.apartment.create({
      data: {
        user_id: userId,
        name: dto.name.trim(),
        province_id: dto.province_id ?? null,
        district_id: dto.district_id ?? null,
        ward_id: dto.ward_id ?? null,
        address: dto.address.trim(),
      },
    });
  }

  async detail(userId: number, id: number) {
    const apt = await this.prisma.apartment.findFirst({
      where: { id, user_id: userId },
      include: { rooms: true },
    });
    if (!apt) throw new NotFoundException('Không tìm thấy tòa nhà');
    return apt;
  }

  async update(userId: number, id: number, dto: UpdateApartmentDto) {
    const exist = await this.prisma.apartment.findFirst({
      where: { id, user_id: userId },
      select: { id: true },
    });
    if (!exist) throw new NotFoundException('Không tìm thấy tòa nhà');

    // Chỉ pick các trường cho phép sửa
    const data: Prisma.ApartmentUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.province_id !== undefined ? { province_id: dto.province_id } : {}),
      ...(dto.district_id !== undefined ? { district_id: dto.district_id } : {}),
      ...(dto.ward_id !== undefined ? { ward_id: dto.ward_id } : {}),
    };

    return this.prisma.apartment.update({
      where: { id },
      data,
    });
  }

  async remove(userId: number, id: number) {
    const exist = await this.prisma.apartment.findFirst({
      where: { id, user_id: userId },
      select: { id: true },
    });
    if (!exist) throw new NotFoundException('Không tìm thấy tòa nhà');

    await this.prisma.apartment.delete({ where: { id } });
    return { ok: true };
  }

  /** Lấy danh sách phòng của 1 apartment, và đảm bảo apartment thuộc user */
  async getRooms(userId: number, apartmentId: number, q = '', page = 1, take = 10) {
    await this.ensureApartmentOwnedByUser(apartmentId, userId);

    const { page: _page, take: _take, skip } = this.sanitizePaging(page, take);

    const where: Prisma.ApartmentRoomWhereInput = {
      apartment_id: apartmentId,
      ...(q
        ? {
            room_number: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.apartmentRoom.findMany({
        where,
        skip,
        take: _take,
        orderBy: { id: 'desc' },
      }),
      this.prisma.apartmentRoom.count({ where }),
    ]);

    return {
      items,
      total,
      page: _page,
      take: _take,
      pages: Math.max(1, Math.ceil(total / _take)),
    };
  }
}
