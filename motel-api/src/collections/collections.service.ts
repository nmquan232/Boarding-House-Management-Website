import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCollectionDto } from './dto/generate.dto';
import { PayDto } from './dto/pay.dto';

function monthBounds(period: string) {
  // period = "YYYY-MM"
  const [y, m] = period.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) { }

  /** Lấy contract và đảm bảo thuộc user hiện tại (qua room -> apartment.user_id) */
  private async getOwnedContractOrThrow(contractId: number, userId: number) {
    const c = await this.prisma.tenantContract.findUnique({
      where: { id: contractId },
      include: {
        apartment_room: { include: { apartment: true } },
        tenant: true,
        contract_monthly_costs: { include: { monthly_cost: true } },
      },
    });
    if (!c) throw new NotFoundException('Contract not found');
    if (c.apartment_room.apartment.user_id !== userId) {
      throw new ForbiddenException('Contract not owned by current user');
    }
    return c;
  }

  /** Kiểm tra đã có bill trong cùng kỳ hay chưa (idempotent) */
  private async findExistingBillForPeriod(contractId: number, start: Date, end: Date) {
    return this.prisma.roomFeeCollection.findFirst({
      where: {
        tenant_contract_id: contractId,
        // charge_date trong tháng đó (nếu bạn thích có cột period thì đơn giản hơn)
        charge_date: { gte: start, lte: end },
      },
      orderBy: { id: 'desc' },
    });
  }

  /** Tạo bill cho 1 hợp đồng theo kỳ YYYY-MM */
  async generate(userId: number, dto: GenerateCollectionDto) {
    const { start, end } = monthBounds(dto.period);

    // 1) lấy contract (kèm giá, phí cố định)
    const contract = await this.getOwnedContractOrThrow(dto.contract_id, userId);

    // 2) idempotency — nếu đã có bill kỳ này thì trả lại luôn
    const existed = await this.findExistingBillForPeriod(contract.id, start, end);
    if (existed) {
      // Có thể trả existed kèm safe BigInt -> string
      return this.toSafeBill(existed);
    }

    // 3) lấy readings (trước kỳ & cuối kỳ) cho điện/nước
    // Nếu có chỉ số được nhập từ DTO thì dùng, nếu không thì lấy từ usages
    let elecAfterNum: number | null = null;
    let waterAfterNum: number | null = null;

    if (dto.electricity_num_after !== undefined && dto.electricity_num_after !== null) {
      // Dùng chỉ số được nhập
      elecAfterNum = dto.electricity_num_after;
    } else {
      // Lấy từ usages như cũ
      const elecEnd = await this.prisma.electricityUsage.findFirst({
        where: { apartment_room_id: contract.apartment_room_id, input_date: { lte: end } },
        orderBy: { input_date: 'desc' },
      });
      elecAfterNum = elecEnd?.usage_number ?? null;
    }

    if (dto.water_number_after !== undefined && dto.water_number_after !== null) {
      // Dùng chỉ số được nhập
      waterAfterNum = dto.water_number_after;
    } else {
      // Lấy từ usages như cũ
      const waterEnd = await this.prisma.waterUsage.findFirst({
        where: { apartment_room_id: contract.apartment_room_id, input_date: { lte: end } },
        orderBy: { input_date: 'desc' },
      });
      waterAfterNum = waterEnd?.usage_number ?? null;
    }

    // Lấy chỉ số trước kỳ (luôn từ usages hoặc contract)
    const elecBefore = await this.prisma.electricityUsage.findFirst({
      where: { apartment_room_id: contract.apartment_room_id, input_date: { lt: start } },
      orderBy: { input_date: 'desc' },
    });
    const waterBefore = await this.prisma.waterUsage.findFirst({
      where: { apartment_room_id: contract.apartment_room_id, input_date: { lt: start } },
      orderBy: { input_date: 'desc' },
    });

    // 4) validate readings
    if (elecAfterNum === null || waterAfterNum === null) {
      throw new BadRequestException('Thiếu chỉ số cuối kỳ (điện hoặc nước) — hãy nhập chỉ số đến cuối tháng trước khi tạo hóa đơn');
    }
    // nếu không có before -> dùng số start trong contract (nếu có)
    const elecBeforeNum = elecBefore?.usage_number ?? contract.electricity_num_start ?? null;
    const waterBeforeNum = waterBefore?.usage_number ?? contract.water_number_start ?? null;
    if (elecBeforeNum === null || waterBeforeNum === null) {
      throw new BadRequestException('Thiếu chỉ số đầu kỳ (điện hoặc nước). Hãy nhập chỉ số trước kỳ hoặc khai báo *_start trong hợp đồng.');
    }
    if (elecAfterNum < elecBeforeNum || waterAfterNum < waterBeforeNum) {
      throw new BadRequestException('Chỉ số sau kỳ nhỏ hơn trước kỳ — kiểm tra lại công tơ (reset/thay mới?).');
    }

    const kwh = BigInt(elecAfterNum - elecBeforeNum);
    const m3 = BigInt(waterAfterNum - waterBeforeNum);

    // 5) tính tiền BigInt
    const roomFee = contract.price; // BigInt
    const elecPrice = BigInt(contract.electricity_price ?? 0);
    const waterPrice = BigInt(contract.water_price ?? 0);
    const elecMoney = kwh * elecPrice;
    const waterMoney = m3 * waterPrice;
    const fixedCosts = contract.contract_monthly_costs
      .map(x => x.price)
      .reduce((s, x) => s + x, 0n);

    const total = roomFee + elecMoney + waterMoney + fixedCosts;

    // 6) tạo bill trong transaction
    const chargeDate = dto.charge_date ? new Date(dto.charge_date) : end; // mặc định cuối tháng
    const created = await this.prisma.$transaction(async (tx) => {
      // kiểm tra lần nữa idempotent trong transaction
      const dup = await tx.roomFeeCollection.findFirst({
        where: { tenant_contract_id: contract.id, charge_date: { gte: start, lte: end } },
      });
      if (dup) return dup;

      return tx.roomFeeCollection.create({
        data: {
          tenant_contract_id: contract.id,
          apartment_room_id: contract.apartment_room_id,
          tenant_id: contract.tenant_id,
          electricity_num_before: Number(elecBeforeNum),
          electricity_num_after: elecAfterNum,
          water_number_before: Number(waterBeforeNum),
          water_number_after: waterAfterNum,
          charge_date: chargeDate,
          total_debt: 0n,
          total_price: total,
          total_paid: 0n,
          fee_collection_uuid: crypto.randomUUID(), // cần `import * as crypto from 'crypto'` nếu TS target CJS
        },
      });
    });

    return this.toSafeBill(created);
  }

  /** Xem chi tiết bill (kèm BigInt → string) và histories */
  async detail(userId: number, id: number) {
    const bill = await this.prisma.roomFeeCollection.findUnique({
      where: { id },
      include: {
        tenant_contract: {
          include: {
            apartment_room: { include: { apartment: true } },
            tenant: true,
            contract_monthly_costs: true,
          },
        },
        histories: true,
      },
    });
    if (!bill) throw new NotFoundException('Bill not found');
    if (bill.tenant_contract.apartment_room.apartment.user_id !== userId) {
      throw new ForbiddenException('Bill not owned by current user');
    }
    // safe response
    return this.toSafeBill({
      ...bill,
      histories: bill.histories.map(h => ({ ...h, price: h.price.toString() })),
      total_price: bill.total_price,
      total_paid: bill.total_paid,
      total_debt: bill.total_debt,
    });
  }

  /** Ghi thanh toán (append-only) trong transaction */
  async pay(userId: number, id: number, body: PayDto) {
    const amount = BigInt(body.amount);
    if (amount <= 0n) throw new BadRequestException('Amount must be > 0');

    const res = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.roomFeeCollection.findUnique({
        where: { id },
        include: {
          tenant_contract: { include: { apartment_room: { include: { apartment: true } } } },
        },
      });
      if (!bill) throw new NotFoundException('Bill not found');
      if (bill.tenant_contract.apartment_room.apartment.user_id !== userId) {
        throw new ForbiddenException('Bill not owned by current user');
      }

      const remain = (bill.total_price ?? 0n) - (bill.total_paid ?? 0n);
      if (amount > remain) {
        throw new BadRequestException('Số tiền vượt quá phần còn lại');
      }

      await tx.roomFeeCollectionHistory.create({
        data: {
          room_fee_collection_id: bill.id,
          paid_date: body.paid_date ? new Date(body.paid_date) : new Date(),
          price: amount,
        },
      });

      const updated = await tx.roomFeeCollection.update({
        where: { id: bill.id },
        data: { total_paid: (bill.total_paid ?? 0n) + amount },
      });

      return updated;
    });

    return this.toSafeBill(res);
  }

  /** Chuyển BigInt -> string để JSON không lỗi */
  private toSafeBill(b: any) {
    const safe = {
      ...b,
      total_price: b.total_price?.toString() ?? null,
      total_paid: b.total_paid?.toString() ?? null,
      total_debt: b.total_debt?.toString() ?? null,
    };
    return safe;
  }
}
