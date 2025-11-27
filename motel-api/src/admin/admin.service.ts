import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpsertMonthlyCostDto } from './dto/upsert-monthly-cost.dto.js';

function formatMonthKey(date: Date) {
    const y = date.getUTCFullYear();
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    return `${y}-${m}`;
}

function parseMonthToDate(month: string, isStart = true) {
    const [y, m] = month.split('-').map((v) => Number(v));
    if (!y || !m || m < 1 || m > 12) {
        throw new BadRequestException(
            'Tham số tháng không hợp lệ. Định dạng đúng: YYYY-MM',
        );
    }
    if (isStart) {
        return new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    }
    return new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
}

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) { }

    async listUsers(page = 1, take = 10, q?: string) {
        page = Number.isFinite(page) ? Math.max(1, page) : 1;
        take = Number.isFinite(take) ? Math.min(50, Math.max(1, take)) : 10;
        const where: Prisma.UserWhereInput = {
            ...(q
                ? {
                    OR: [
                        { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                        { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
                    ],
                }
                : {}),
        };

        const [users, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                where,
                orderBy: { id: 'desc' },
                skip: (page - 1) * take,
                take,
            }),
            this.prisma.user.count({ where }),
        ]);

        const userIds = users.map((u) => u.id);
        const apartmentsByUser: Record<number, number> = {};
        const roomsByUser: Record<number, number> = {};

        if (userIds.length > 0) {
            const apartments = await this.prisma.apartment.findMany({
                where: { user_id: { in: userIds } },
                select: { user_id: true, _count: { select: { rooms: true } } },
            });

            apartments.forEach((apt) => {
                apartmentsByUser[apt.user_id] =
                    (apartmentsByUser[apt.user_id] || 0) + 1;
                roomsByUser[apt.user_id] =
                    (roomsByUser[apt.user_id] || 0) + (apt._count.rooms || 0);
            });
        }

        return {
            items: users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'USER',
                apartments_count: apartmentsByUser[user.id] || 0,
                rooms_count: roomsByUser[user.id] || 0,
            })),
            total,
            page,
            take,
            pages: Math.ceil(total / take),
        };
    }

    private generateRandomPassword() {
        return crypto
            .randomBytes(6)
            .toString('base64')
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, 10);
    }

    async resetUserPassword(userId: number, dto: ResetPasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User không tồn tại');

        const newPassword =
            dto.newPassword && dto.newPassword.trim().length > 0
                ? dto.newPassword
                : this.generateRandomPassword();
        const hash = await bcrypt.hash(newPassword, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hash },
        });

        return { userId, newPassword };
    }

    async removeUser(userId: number) {
        return this.prisma.$transaction(async (tx) => {
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) throw new NotFoundException('User không tồn tại');

            const apartments = await tx.apartment.findMany({
                where: { user_id: userId },
                select: {
                    id: true,
                    rooms: {
                        select: {
                            id: true,
                            contracts: {
                                select: {
                                    id: true,
                                    room_fee_collections: { select: { id: true } },
                                },
                            },
                        },
                    },
                },
            });

            const apartmentIds = apartments.map((a) => a.id);
            const roomIds = apartments.flatMap((a) => a.rooms.map((r) => r.id));
            const contractIds = apartments.flatMap((a) =>
                a.rooms.flatMap((r) => r.contracts.map((c) => c.id)),
            );
            const billIds = apartments.flatMap((a) =>
                a.rooms.flatMap((r) =>
                    r.contracts.flatMap((c) => c.room_fee_collections.map((b) => b.id)),
                ),
            );

            if (billIds.length > 0) {
                await tx.roomFeeCollectionHistory.deleteMany({
                    where: { room_fee_collection_id: { in: billIds } },
                });
                await tx.roomFeeCollection.deleteMany({
                    where: { id: { in: billIds } },
                });
            }

            if (contractIds.length > 0) {
                await tx.contractMonthlyCost.deleteMany({
                    where: { tenant_contract_id: { in: contractIds } },
                });
                await tx.tenantContract.deleteMany({
                    where: { id: { in: contractIds } },
                });
            }

            if (roomIds.length > 0) {
                await tx.electricityUsage.deleteMany({
                    where: { apartment_room_id: { in: roomIds } },
                });
                await tx.waterUsage.deleteMany({
                    where: { apartment_room_id: { in: roomIds } },
                });
                await tx.apartmentRoom.deleteMany({
                    where: { id: { in: roomIds } },
                });
            }

            if (apartmentIds.length > 0) {
                await tx.apartment.deleteMany({ where: { id: { in: apartmentIds } } });
            }

            await tx.user.delete({ where: { id: userId } });
            return { ok: true };
        });
    }

    async listMonthlyCosts(page = 1, take = 10, q?: string) {
        page = Number.isFinite(page) ? Math.max(1, page) : 1;
        take = Number.isFinite(take) ? Math.min(50, Math.max(1, take)) : 10;
        const where: Prisma.MonthlyCostWhereInput = q
            ? { name: { contains: q, mode: Prisma.QueryMode.insensitive } }
            : {};

        const [items, total] = await this.prisma.$transaction([
            this.prisma.monthlyCost.findMany({
                where,
                orderBy: { id: 'desc' },
                skip: (page - 1) * take,
                take,
            }),
            this.prisma.monthlyCost.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            take,
            pages: Math.ceil(total / take),
        };
    }

    async createMonthlyCost(dto: UpsertMonthlyCostDto) {
        const created = await this.prisma.monthlyCost.create({
            data: {
                name: dto.name,
            },
        });
        return created;
    }

    async updateMonthlyCost(id: number, dto: UpsertMonthlyCostDto) {
        const updated = await this.prisma.monthlyCost.update({
            where: { id },
            data: {
                name: dto.name,
            },
        });
        return updated;
    }

    async deleteMonthlyCost(id: number) {
        const used = await this.prisma.contractMonthlyCost.count({
            where: { monthly_cost_id: id },
        });
        if (used > 0) {
            throw new BadRequestException(
                'Không thể xóa phụ phí đang được sử dụng trong hợp đồng',
            );
        }
        await this.prisma.monthlyCost.delete({ where: { id } });
        return { ok: true };
    }

    async overview() {
        const [users, apartments, rooms, contracts, aggregates] = await Promise.all(
            [
                this.prisma.user.count(),
                this.prisma.apartment.count(),
                this.prisma.apartmentRoom.count(),
                this.prisma.tenantContract.count({ where: { end_date: null } }),
                this.prisma.roomFeeCollection.aggregate({
                    _sum: { total_price: true, total_paid: true },
                }),
            ],
        );

        const totalPrice = aggregates._sum.total_price ?? BigInt(0);
        const totalPaid = aggregates._sum.total_paid ?? BigInt(0);
        const outstanding = totalPrice - totalPaid;

        return {
            total_users: users,
            total_apartments: apartments,
            total_rooms: rooms,
            active_contracts: contracts,
            total_rent: totalPrice.toString(),
            total_outstanding: outstanding.toString(),
        };
    }

    async rentChart(fromMonth?: string, toMonth?: string) {
        const now = new Date();
        const defaultEnd = new Date(
            Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        );
        defaultEnd.setUTCMonth(defaultEnd.getUTCMonth() + 1);
        defaultEnd.setUTCDate(0);
        defaultEnd.setUTCHours(23, 59, 59, 999);

        const end = toMonth ? parseMonthToDate(toMonth, false) : defaultEnd;

        let start: Date;
        if (fromMonth) {
            start = parseMonthToDate(fromMonth, true);
        } else {
            const temp = new Date(end);
            temp.setUTCMonth(temp.getUTCMonth() - 5);
            temp.setUTCDate(1);
            temp.setUTCHours(0, 0, 0, 0);
            start = temp;
        }

        const bills = await this.prisma.roomFeeCollection.findMany({
            where: {
                charge_date: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                charge_date: true,
                total_price: true,
                total_paid: true,
            },
            orderBy: { charge_date: 'asc' },
        });

        const bucket: Record<
            string,
            {
                month: string;
                total_price: bigint;
                total_debt: bigint;
            }
        > = {};

        bills.forEach((bill) => {
            if (!bill.charge_date) return;
            const key = formatMonthKey(bill.charge_date);
            if (!bucket[key]) {
                bucket[key] = {
                    month: key,
                    total_price: BigInt(0),
                    total_debt: BigInt(0),
                };
            }
            const total = bill.total_price ?? BigInt(0);
            const paid = bill.total_paid ?? BigInt(0);
            bucket[key].total_price += total;
            bucket[key].total_debt += total - paid;
        });

        const points = Object.values(bucket)
            .sort((a, b) => (a.month > b.month ? 1 : -1))
            .map((item) => ({
                month: item.month,
                total_price: item.total_price.toString(),
                total_debt: item.total_debt.toString(),
            }));

        return {
            from: formatMonthKey(start),
            to: formatMonthKey(end),
            points,
        };
    }
}
