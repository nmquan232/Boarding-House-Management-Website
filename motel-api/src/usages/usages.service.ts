import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsagesService {
  constructor(private prisma: PrismaService) { }

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
      if (to) where.input_date.lte = new Date(to);
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
      if (to) where.input_date.lte = new Date(to);
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

  /** Cho "YYYY-MM" -> start = đầu tháng, end = cuối tháng (UTC) */
  private monthBounds(period: string) {
    const [y, m] = period.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    return { start, end };
  }

  /** 🔽 ADD: tìm hợp đồng đang hiệu lực trong khoảng [start,end] cho room */
  private async getActiveContractForPeriod(userId: number, roomId: number, start: Date, end: Date) {
    await this.ensureRoomOwnedByUser(roomId, userId);

    const contract = await this.prisma.tenantContract.findFirst({
      where: {
        apartment_room_id: roomId,    
        start_date: { lte: end },
        OR: [{ end_date: null }, { end_date: { gte: start } }],
      },
      include: {
        contract_monthly_costs: { include: { monthly_cost: true } },
      },
      orderBy: { start_date: 'desc' },
    });

    if (!contract) throw new NotFoundException('No active contract for given period');
    return contract;
  }


  /** 🔽 ADD: tính tiền chi tiết theo khoảng ngày (preview, KHÔNG tạo hóa đơn) */
  async calcChargeForPeriod(userId: number, roomId: number, start: Date, end: Date) {
    // 1) hợp đồng
    const contract = await this.getActiveContractForPeriod(userId, roomId, start, end);

    // 2) readings
    const [{ before: eBefore, endReading: eEnd }, { before: wBefore, endReading: wEnd }] =
      await Promise.all([
        this.getElectricityRangeForPeriod(userId, roomId, start, end),
        this.getWaterRangeForPeriod(userId, roomId, start, end),
      ]);

    if (!eEnd || !wEnd) {
      throw new BadRequestException('Thiếu chỉ số cuối kỳ (điện hoặc nước)');
    }

    const eBeforeNum = eBefore?.usage_number ?? contract.electricity_num_start ?? null;
    const wBeforeNum = wBefore?.usage_number ?? contract.water_number_start ?? null;

    if (eBeforeNum === null || wBeforeNum === null) {
      throw new BadRequestException('Thiếu chỉ số đầu kỳ (điện hoặc nước)');
    }
    if (eEnd.usage_number < eBeforeNum || wEnd.usage_number < wBeforeNum) {
      throw new BadRequestException('Chỉ số sau kỳ nhỏ hơn trước kỳ');
    }

    // 3) tính tiền bằng bigint
    const kwh = BigInt(eEnd.usage_number - eBeforeNum);
    const m3 = BigInt(wEnd.usage_number - wBeforeNum);

    const roomFee = BigInt(contract.price ?? 0);
    const elecPrice = BigInt(contract.electricity_price ?? 0);
    const waterPrice = BigInt(contract.water_price ?? 0);
    const elecMoney = kwh * elecPrice;
    const waterMoney = m3 * waterPrice;

    const fixedCosts = contract.contract_monthly_costs
      .map(x => x.price) // BigInt trong schema
      .reduce((s, x) => s + x, 0n);

    const total = roomFee + elecMoney + waterMoney + fixedCosts;

    // 4) trả về bảng kê (convert -> string để FE hiển thị)
    return {
      period: { start, end },
      readings: {
        electricity: { before: Number(eBeforeNum), after: eEnd.usage_number, used: Number(kwh) },
        water: { before: Number(wBeforeNum), after: wEnd.usage_number, used: Number(m3) },
      },
      prices: {
        room: roomFee.toString(),
        elec_price: elecPrice.toString(),
        water_price: waterPrice.toString(),
        fixed_costs: fixedCosts.toString(),
      },
      amounts: {
        elec_money: elecMoney.toString(),
        water_money: waterMoney.toString(),
        total: total.toString(),
      },
      // gắn thêm thông tin nhận dạng để FE show
      contract: {
        id: contract.id,
        tenant_id: contract.tenant_id,
        room_id: contract.apartment_room_id,
      },
    };
  }

  /** 🔽 ADD: tính tiền theo tháng "YYYY-MM" (preview, KHÔNG tạo hóa đơn) */
  async calcChargeForMonth(userId: number, roomId: number, month: string) {
    const { start, end } = this.monthBounds(month);
    return this.calcChargeForPeriod(userId, roomId, start, end);
  }

  // -------------------- Helper: Theo tháng (giữ nguyên hoặc gộp dùng monthBounds) --------------------

  /** Cho Ngày 7: lấy range theo tháng "YYYY-MM" (start = đầu tháng, end = cuối tháng) */
  async getRangesByMonth(userId: number, roomId: number, month: string) {
    const { start, end } = this.monthBounds(month);
    const [elec, water] = await Promise.all([
      this.getElectricityRangeForPeriod(userId, roomId, start, end),
      this.getWaterRangeForPeriod(userId, roomId, start, end),
    ]);
    return { start, end, electricity: elec, water };
  }
  
}
