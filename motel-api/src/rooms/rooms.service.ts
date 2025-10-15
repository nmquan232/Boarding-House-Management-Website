
import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Prisma } from '@prisma/client';


@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  /** Xác thực apartment thuộc user đang đăng nhập */
  private async ensureApartmentOwnedByUser(apartmentId: number, userId: number) {
    const apt = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, user_id: userId },
      select: { id: true },
    });
    if (!apt) throw new ForbiddenException('Apartment không thuộc quyền của bạn hoặc không tồn tại');
  }

  /** Lấy 1 phòng và đảm bảo nó thuộc apartment của user */
  private async getRoomOwned(id: number, userId: number) {
    const room = await this.prisma.apartmentRoom.findUnique({
      where: { id },
      include: { apartment: true },
    });
    if (!room) throw new NotFoundException('Không tìm thấy phòng');
    if (room.apartment.user_id !== userId) throw new ForbiddenException('Bạn không có quyền với phòng này');
    return room;
  }

  /** Danh sách phòng theo apartment, có search + phân trang */
  async list(userId: number, apartmentId: number, q?: string, page = 1, take = 10) {
    await this.ensureApartmentOwnedByUser(apartmentId, userId);

    const where = {
      apartment_id: apartmentId,
      ...(q
        ? {
            OR: [
              { room_number: { contains: q, mode: Prisma.QueryMode.insensitive } },
              // nếu muốn search theo price thì parse số, ở đây bỏ qua
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.apartmentRoom.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.apartmentRoom.count({ where }),
    ]);

    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  /** Tạo phòng mới trong apartment */
  async create(userId: number, apartmentId: number, dto: CreateRoomDto) {
    await this.ensureApartmentOwnedByUser(apartmentId, userId);

    return this.prisma.apartmentRoom.create({
      data: {
        apartment_id: apartmentId,
        room_number: dto.room_number,
        // ép kiểu BigInt từ chuỗi nếu FE gửi string
        default_price: dto.default_price ? BigInt(dto.default_price) : BigInt(0),
        max_tenant: dto.max_tenant ?? null,
      },
    });
  }

  /** Chi tiết 1 phòng */
  async detail(userId: number, id: number) {
    const room = await this.getRoomOwned(id, userId);
    // có thể include usages/contracts nếu cần
    return room;
  }

  /** Cập nhật 1 phòng */
  async update(userId: number, id: number, dto: UpdateRoomDto) {
    await this.getRoomOwned(id, userId);

    return this.prisma.apartmentRoom.update({
      where: { id },
      data: {
        room_number: dto.room_number,
        default_price: dto.default_price !== undefined ? BigInt(dto.default_price) : undefined,
        max_tenant: dto.max_tenant,
      },
    });
  }

  /** Xóa 1 phòng */
  async remove(userId: number, id: number) {
    await this.getRoomOwned(id, userId);
    await this.prisma.apartmentRoom.delete({ where: { id } });
    return { ok: true };
  }
}
