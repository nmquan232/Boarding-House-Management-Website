import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsagesService {
  constructor(private prisma: PrismaService) {}

  /** Đảm bảo room thuộc apartment của user hiện tại */
  private async ensureRoomOwnedByUser(roomId: number, userId: number) {
    const room = await this.prisma.apartmentRoom.findUnique({
      where: { id: roomId },
      include: { apartment: { select: { user_id: true } } },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.apartment.user_id !== userId) {
      throw new ForbiddenException('Room not owned by current user');
    }
    return room;
  }

  // -------------------- ELECTRICITY --------------------

  async addElectricityUsage(userId: number, roomId: number, usage_number: number, input_date: string) {
    await this.ensureRoomOwnedByUser(roomId, userId);
    return this.prisma.electricityUsage.create({
      data: {
        apartment_room_id: roomId,
        usage_number,
        input_date: new Date(input_date),
      },
    });
  }

  async listElectricity(userId: number, roomId: number, from?: string, to?: string, page = 1, take = 10) {
    await this.ensureRoomOwnedByUser(roomId, userId);
    const where: any = { apartment_room_id: roomId };
    if (from || to) {
      where.input_date = {};
      if (from) where.input_date.gte = new Date(from);
      if (to)   where.input_date.lte = new Date(to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.electricityUsage.findMany({
        where,
        orderBy: { input_date: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.electricityUsage.count({ where }),
    ]);
    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  /** Lấy reading điện: trước kỳ (max < start) và cuối kỳ (max <= end) */
  async getElectricityRangeForPeriod(userId: number, roomId: number, start: Date, end: Date) {
    await this.ensureRoomOwnedByUser(roomId, userId);

    const before = await this.prisma.electricityUsage.findFirst({
      where: { apartment_room_id: roomId, input_date: { lt: start } },
      orderBy: { input_date: 'desc' },
    });
    const endReading = await this.prisma.electricityUsage.findFirst({
      where: { apartment_room_id: roomId, input_date: { lte: end } },
      orderBy: { input_date: 'desc' },
    });
    return { before, endReading };
  }

  // -------------------- WATER --------------------

  async addWaterUsage(userId: number, roomId: number, usage_number: number, input_date: string) {
    await this.ensureRoomOwnedByUser(roomId, userId);
    return this.prisma.waterUsage.create({
      data: {
        apartment_room_id: roomId,
        usage_number,
        input_date: new Date(input_date),
      },
    });
  }

  async listWater(userId: number, roomId: number, from?: string, to?: string, page = 1, take = 10) {
    await this.ensureRoomOwnedByUser(roomId, userId);
    const where: any = { apartment_room_id: roomId };
    if (from || to) {
      where.input_date = {};
      if (from) where.input_date.gte = new Date(from);
      if (to)   where.input_date.lte = new Date(to);
    }
    const [items, total] = await this.prisma.$transaction([
      this.prisma.waterUsage.findMany({
        where,
        orderBy: { input_date: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.waterUsage.count({ where }),
    ]);
    return { items, total, page, take, pages: Math.ceil(total / take) };
  }

  /** Lấy reading nước: trước kỳ (max < start) và cuối kỳ (max <= end) */
  async getWaterRangeForPeriod(userId: number, roomId: number, start: Date, end: Date) {
    await this.ensureRoomOwnedByUser(roomId, userId);

    const before = await this.prisma.waterUsage.findFirst({
      where: { apartment_room_id: roomId, input_date: { lt: start } },
      orderBy: { input_date: 'desc' },
    });
    const endReading = await this.prisma.waterUsage.findFirst({
      where: { apartment_room_id: roomId, input_date: { lte: end } },
      orderBy: { input_date: 'desc' },
    });
    return { before, endReading };
  }

  // -------------------- Helper: Theo tháng --------------------

  /** Cho Ngày 7: lấy range theo tháng "YYYY-MM" (start = đầu tháng, end = cuối tháng) */
  async getRangesByMonth(userId: number, roomId: number, month: string) {
    // month: "2025-10"
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // cuối tháng

    const [elec, water] = await Promise.all([
      this.getElectricityRangeForPeriod(userId, roomId, start, end),
      this.getWaterRangeForPeriod(userId, roomId, start, end),
    ]);
    return { start, end, electricity: elec, water };
  }
}
