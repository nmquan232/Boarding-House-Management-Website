import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateCollectionDto } from './dto/generate.dto';
import { PayDto } from './dto/pay.dto';
import * as crypto from 'crypto';

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
    // Kiểm tra tất cả hóa đơn của contract này
    // Nếu charge_date nằm trong khoảng start-end thì coi như đã có hóa đơn cho kỳ này
    // Nếu charge_date là null, cần kiểm tra thêm bằng cách so sánh với tất cả hóa đơn
    const bills = await this.prisma.roomFeeCollection.findMany({
      where: {
        tenant_contract_id: contractId,
      },
      orderBy: { id: 'desc' },
    });

    // Kiểm tra xem có hóa đơn nào có charge_date trong khoảng start-end không
    const billInPeriod = bills.find(
      (b) => b.charge_date && b.charge_date >= start && b.charge_date <= end,
    );

    if (billInPeriod) {
      return billInPeriod;
    }

    // Nếu không tìm thấy bằng charge_date, kiểm tra xem có hóa đơn nào có charge_date null
    // và không có hóa đơn nào khác trong khoảng start-end
    // Trong trường hợp này, cho phép tạo hóa đơn mới cho kỳ khác
    return null;
  }

  /** Tạo bill cho 1 hợp đồng theo kỳ YYYY-MM */
  async generate(userId: number, dto: GenerateCollectionDto) {
    console.log('[CollectionsService] generate called with:', { userId, dto });
    const { start, end } = monthBounds(dto.period);
    console.log('[CollectionsService] period bounds:', { start, end });

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

    // Lấy chỉ số trước kỳ: ưu tiên từ hóa đơn tháng trước, sau đó mới từ usages hoặc contract
    // Tìm hóa đơn gần nhất trước tháng hiện tại
    // Tìm tất cả hóa đơn của contract này, sau đó filter trong code
    const allBills = await this.prisma.roomFeeCollection.findMany({
      where: {
        tenant_contract_id: contract.id,
      },
      orderBy: { id: 'desc' },
    });

    // Tìm hóa đơn có charge_date trước tháng hiện tại
    // Ưu tiên tìm hóa đơn có charge_date rõ ràng (không null) và trước tháng hiện tại
    let previousBill = allBills.find(
      (b) => b.charge_date && b.charge_date < start,
    );

    // Nếu không tìm thấy hóa đơn có charge_date rõ ràng, tìm hóa đơn có charge_date null
    // nhưng chỉ dùng nếu đó là hóa đơn duy nhất hoặc là hóa đơn mới nhất
    if (!previousBill && allBills.length > 0) {
      // Tìm hóa đơn có charge_date null và có chỉ số điện/nước
      const billWithNullDate = allBills.find(
        (b) => !b.charge_date && (b.electricity_num_after !== null || b.water_number_after !== null),
      );
      if (billWithNullDate) {
        previousBill = billWithNullDate;
      }
    }

    let elecBeforeNum: number | null = null;
    let waterBeforeNum: number | null = null;

    // Nếu có hóa đơn tháng trước và có chỉ số cuối kỳ, lấy từ đó
    if (previousBill) {
      elecBeforeNum = previousBill.electricity_num_after ?? null;
      waterBeforeNum = previousBill.water_number_after ?? null;
    }

    // Nếu không có hóa đơn tháng trước hoặc không có chỉ số, tìm trong usages hoặc dùng contract start
    if (elecBeforeNum === null) {
      const elecBefore = await this.prisma.electricityUsage.findFirst({
        where: { apartment_room_id: contract.apartment_room_id, input_date: { lt: start } },
        orderBy: { input_date: 'desc' },
      });
      elecBeforeNum = elecBefore?.usage_number ?? contract.electricity_num_start ?? null;
    }

    if (waterBeforeNum === null) {
      const waterBefore = await this.prisma.waterUsage.findFirst({
        where: { apartment_room_id: contract.apartment_room_id, input_date: { lt: start } },
        orderBy: { input_date: 'desc' },
      });
      waterBeforeNum = waterBefore?.usage_number ?? contract.water_number_start ?? null;
    }

    // 4) validate readings
    console.log('[CollectionsService] Readings:', {
      elecBeforeNum,
      elecAfterNum,
      waterBeforeNum,
      waterAfterNum,
      hasPreviousBill: !!previousBill,
    });

    if (elecAfterNum === null || waterAfterNum === null) {
      const errorMsg = `Thiếu chỉ số cuối kỳ (điện hoặc nước) — hãy nhập chỉ số đến cuối tháng trước khi tạo hóa đơn. ` +
        `Điện: ${elecAfterNum ?? 'null'}, Nước: ${waterAfterNum ?? 'null'}`;
      console.error('[CollectionsService]', errorMsg);
      throw new BadRequestException(errorMsg);
    }
    if (elecBeforeNum === null || waterBeforeNum === null) {
      const hasPreviousBill = previousBill ? 'Có' : 'Không có';
      const errorMsg = `Thiếu chỉ số đầu kỳ (điện hoặc nước). ` +
        `Điện: ${elecBeforeNum ?? 'null'}, Nước: ${waterBeforeNum ?? 'null'}. ` +
        `${hasPreviousBill} hóa đơn tháng trước. ` +
        `Hãy nhập chỉ số trước kỳ hoặc khai báo *_start trong hợp đồng.`;
      console.error('[CollectionsService]', errorMsg);
      throw new BadRequestException(errorMsg);
    }
    if (elecAfterNum < elecBeforeNum || waterAfterNum < waterBeforeNum) {
      const errorMsg = `Chỉ số sau kỳ nhỏ hơn trước kỳ — kiểm tra lại công tơ (reset/thay mới?). ` +
        `Điện: ${elecBeforeNum} → ${elecAfterNum}, Nước: ${waterBeforeNum} → ${waterAfterNum}`;
      console.error('[CollectionsService]', errorMsg);
      throw new BadRequestException(errorMsg);
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
    console.log('[CollectionsService] Creating bill with:', {
      contract_id: contract.id,
      chargeDate,
      total: total.toString(),
    });

    let created;
    try {
      created = await this.prisma.$transaction(async (tx) => {
        // kiểm tra lần nữa idempotent trong transaction
        // Lấy tất cả hóa đơn của contract và kiểm tra trong code
        const allBillsInTx = await tx.roomFeeCollection.findMany({
          where: { tenant_contract_id: contract.id },
          orderBy: { id: 'desc' },
        });

        // Kiểm tra xem có hóa đơn nào có charge_date trong khoảng start-end không
        const dup = allBillsInTx.find(
          (b) => b.charge_date && b.charge_date >= start && b.charge_date <= end,
        );

        if (dup) {
          console.log('[CollectionsService] Found duplicate bill:', dup.id);
          return dup;
        }

        console.log('[CollectionsService] Creating new bill...');
        const newBill = await tx.roomFeeCollection.create({
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
            fee_collection_uuid: crypto.randomUUID(),
          },
        });

        console.log('[CollectionsService] Bill created successfully:', newBill.id);

        // Đảm bảo bill được tạo thành công
        if (!newBill || !newBill.id) {
          throw new BadRequestException('Không thể tạo hóa đơn trong database');
        }

        return newBill;
      });
    } catch (error: any) {
      console.error('[CollectionsService] Error creating bill:', error);
      console.error('[CollectionsService] Error stack:', error?.stack);
      if (error instanceof BadRequestException || error instanceof ForbiddenException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Lỗi khi tạo hóa đơn: ${error?.message || error?.code || 'Unknown error'}`
      );
    }

    if (!created) {
      console.error('[CollectionsService] Transaction returned null/undefined');
      throw new BadRequestException('Không thể tạo hóa đơn - transaction không trả về dữ liệu');
    }

    console.log('[CollectionsService] Returning bill:', created.id);
    return this.toSafeBill(created);
  }

  /** Danh sách hóa đơn của user */
  async list(userId: number, page = 1, take = 10, status?: 'paid' | 'unpaid' | 'all') {
    const where: any = {
      tenant_contract: {
        apartment_room: {
          apartment: { user_id: userId },
        },
      },
    };

    const [items, total] = await Promise.all([
      this.prisma.roomFeeCollection.findMany({
        where,
        include: {
          tenant_contract: {
            include: {
              apartment_room: { include: { apartment: true } },
              tenant: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip: (page - 1) * take,
        take,
      }),
      this.prisma.roomFeeCollection.count({ where }),
    ]);

    // Filter theo trạng thái thanh toán ở application level
    let filteredItems = items;
    if (status === 'paid') {
      // Đã thanh toán: total_paid >= total_price
      filteredItems = items.filter(
        (item) =>
          item.total_paid &&
          item.total_price &&
          item.total_paid >= item.total_price,
      );
    } else if (status === 'unpaid') {
      // Chưa thanh toán: total_paid < total_price hoặc total_paid = null/0
      filteredItems = items.filter(
        (item) =>
          !item.total_paid ||
          item.total_paid === 0n ||
          (item.total_price && item.total_paid < item.total_price),
      );
    }

    return {
      items: filteredItems.map((item) => this.toSafeBill(item)),
      total: status ? filteredItems.length : total,
      page,
      take,
      pages: Math.ceil((status ? filteredItems.length : total) / take),
    };
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

  /** Xóa hóa đơn */
  async remove(userId: number, id: number) {
    // Kiểm tra hóa đơn có tồn tại và thuộc user không
    const bill = await this.prisma.roomFeeCollection.findUnique({
      where: { id },
      include: {
        tenant_contract: {
          include: {
            apartment_room: { include: { apartment: true } },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Hóa đơn không tồn tại');
    }

    if (bill.tenant_contract.apartment_room.apartment.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa hóa đơn này');
    }

    // Xóa lịch sử thanh toán trước (cascade)
    await this.prisma.roomFeeCollectionHistory.deleteMany({
      where: { room_fee_collection_id: id },
    });

    // Xóa hóa đơn
    await this.prisma.roomFeeCollection.delete({
      where: { id },
    });

    return { ok: true, message: 'Đã xóa hóa đơn thành công' };
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
