import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
    await prisma.monthlyCost.createMany({
        data: [{ name: 'Rác' }, { name: 'Wifi' }, { name: 'Gửi xe' }],
        skipDuplicates: true,
    });

    const adminLogin = process.env.ADMIN_LOGIN_ID || 'superadmin';
    const adminEmail = process.env.ADMIN_EMAIL || 'superadmin@motel.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const hash = await bcrypt.hash(adminPassword, 10);

    await prisma.admin.upsert({
        where: { admin_login_id: adminLogin },
        update: { password: hash, email: adminEmail } as any,
        create: {
            admin_uuid: crypto.randomUUID(),
            admin_login_id: adminLogin,
            email: adminEmail,
            password: hash,
        } as any,
    });

    console.log(`Admin account ready: ${adminLogin} / ${adminPassword}`);
}
main().finally(() => prisma.$disconnect());

