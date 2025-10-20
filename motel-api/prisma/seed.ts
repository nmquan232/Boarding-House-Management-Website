import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    await prisma.monthlyCost.createMany({
        data: [
            { name: 'Rác' },
            { name: 'Wifi' },
            { name: 'Gửi xe' },
        ],
        skipDuplicates: true,
    });
}
main().finally(() => prisma.$disconnect());

