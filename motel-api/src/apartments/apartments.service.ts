import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { Prisma } from '@prisma/client';
@Injectable()
export class ApartmentsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: number, q?: string, page = 1, take = 10) {
    const where = {
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
        skip: (page - 1) * take,
        take,
        orderBy: { id: 'desc' },
      }),
      this.prisma.apartment.count({ where }),
    ]);
    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  async create(userId: number, dto: CreateApartmentDto) {
    return this.prisma.apartment.create({
      data: {
        user_id: userId,
        name: dto.name,
        province_id: dto.province_id,
        district_id: dto.district_id,
        ward_id: dto.ward_id,
        address: dto.address,
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
    });
    if (!exist) throw new NotFoundException('Không tìm thấy tòa nhà');

    return this.prisma.apartment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const exist = await this.prisma.apartment.findFirst({
      where: { id, user_id: userId },
    });
    if (!exist) throw new NotFoundException('Không tìm thấy tòa nhà');

    await this.prisma.apartment.delete({ where: { id } });
    return { ok: true };
  }

  async getRooms(apartmentId: number, q = '', page = 1, take = 10) {
  const where = {
    apartment_id: apartmentId,
    ...(q
      ? {
          room_number: {
            contains: q,
            mode: Prisma.QueryMode.insensitive, // ✅ dùng enum chứ không phải string
          },
        }
      : {}),
  };

  const [items, total] = await this.prisma.$transaction([
    this.prisma.apartmentRoom.findMany({
      where,
      skip: (page - 1) * take,
      take,
      orderBy: { id: 'desc' },
    }),
    this.prisma.apartmentRoom.count({ where }),
  ]);

  return { items, total, page, take, pages: Math.ceil(total / take) };
}

}
