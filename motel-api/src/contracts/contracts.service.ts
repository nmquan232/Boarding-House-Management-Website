import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private prisma: PrismaService) {}

  /** Đảm bảo room thuộc apartment của user */
  private async ensureRoomOwnedByUser(apartmentRoomId: number, userId: number) {
    const room = await this.prisma.apartmentRoom.findUnique({
      where: { id: apartmentRoomId },
      include: { apartment: true },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.apartment.user_id !== userId) {
      throw new ForbiddenException('Room not owned by current user');
    }
    return room;
  }

  /** Lấy hợp đồng và đảm bảo thuộc user (qua apartment_room -> apartment.user_id) */
  private async getContractOwnedByUser(contractId: number, userId: number) {
    const contract = await this.prisma.tenantContract.findUnique({
      where: { id: contractId },
      include: {
        apartment_room: { include: { apartment: true } },
        tenant: true,
        contract_monthly_costs: { include: { monthly_cost: true } },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.apartment_room.apartment.user_id !== userId) {
      throw new ForbiddenException('Contract not owned by current user');
    }
    return contract;
  }

  /** Tạo hợp đồng + gán phí cố định */
  async create(userId: number, dto: CreateContractDto) {
    await this.ensureRoomOwnedByUser(dto.apartment_room_id, userId);

    // tạo contract
    const created = await this.prisma.tenantContract.create({
      data: {
        apartment_room_id: dto.apartment_room_id,
        tenant_id: dto.tenant_id,
        pay_period: dto.pay_period ?? 1,
        price: BigInt(dto.price),
        electricity_pay_type_id: dto.electricity_pay_type_id ?? null,
        electricity_price: dto.electricity_price ? BigInt(dto.electricity_price) : null,
        electricity_num_start: dto.electricity_num_start ?? null,
        water_pay_type_id: dto.water_pay_type_id ?? null,
        water_price: dto.water_price ? BigInt(dto.water_price) : null,
        water_number_start: dto.water_number_start ?? null,
        number_of_tenant_current: dto.number_of_tenant_current ?? 1,
        note: dto.note ?? null,
        start_date: new Date(dto.start_date),
        end_date: dto.end_date ? new Date(dto.end_date) : null,
      },
    });

    // gán phí cố định nếu có
    if (dto.monthly_costs?.length) {
      await this.prisma.contractMonthlyCost.createMany({
        data: dto.monthly_costs.map((c) => ({
          tenant_contract_id: created.id,
          monthly_cost_id: c.monthly_cost_id,
          pay_type: c.pay_type ?? 1,
          price: BigInt(c.price),
        })),
      });
    }

    return this.detail(userId, created.id);
  }

  /** Danh sách hợp đồng của user (theo apartment? room? — ở đây list toàn bộ thuộc user) */
  async list(userId: number, page = 1, take = 10) {
    const where = {
      apartment_room: { apartment: { user_id: userId } },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenantContract.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (page - 1) * take,
        take,
        include: {
          apartment_room: { include: { apartment: true } },
          tenant: true,
        },
      }),
      this.prisma.tenantContract.count({ where }),
    ]);

    // BigInt -> string
    const itemsSafe = items.map((it) => ({
      ...it,
      price: it.price.toString(),
      electricity_price: it.electricity_price?.toString() ?? null,
      water_price: it.water_price?.toString() ?? null,
    }));

    return { items: itemsSafe, total, page, take, pages: Math.ceil(total / take) };
  }

  async detail(userId: number, id: number) {
    const c = await this.getContractOwnedByUser(id, userId);
    return {
      ...c,
      price: c.price.toString(),
      electricity_price: c.electricity_price?.toString() ?? null,
      water_price: c.water_price?.toString() ?? null,
      contract_monthly_costs: c.contract_monthly_costs.map((m) => ({
        ...m,
        price: m.price.toString(),
      })),
    };
  }

  async update(userId: number, id: number, dto: UpdateContractDto) {
    await this.getContractOwnedByUser(id, userId);

    const updated = await this.prisma.tenantContract.update({
      where: { id },
      data: {
        apartment_room_id: dto.apartment_room_id,
        tenant_id: dto.tenant_id,
        pay_period: dto.pay_period,
        price: dto.price !== undefined ? BigInt(dto.price) : undefined,
        electricity_pay_type_id: dto.electricity_pay_type_id,
        electricity_price: dto.electricity_price !== undefined ? BigInt(dto.electricity_price) : undefined,
        electricity_num_start: dto.electricity_num_start,
        water_pay_type_id: dto.water_pay_type_id,
        water_price: dto.water_price !== undefined ? BigInt(dto.water_price) : undefined,
        water_number_start: dto.water_number_start,
        number_of_tenant_current: dto.number_of_tenant_current,
        note: dto.note,
        start_date: dto.start_date ? new Date(dto.start_date) : undefined,
        end_date: dto.end_date ? new Date(dto.end_date) : undefined,
      },
    });

    // nếu muốn cập nhật lại monthly_costs, bạn có thể xóa hết rồi createMany lại:
    // if (dto.monthly_costs) { ... }

    return this.detail(userId, updated.id);
  }

  async remove(userId: number, id: number) {
    await this.getContractOwnedByUser(id, userId);
    await this.prisma.contractMonthlyCost.deleteMany({ where: { tenant_contract_id: id } });
    await this.prisma.tenantContract.delete({ where: { id } });
    return { ok: true };
  }
}
