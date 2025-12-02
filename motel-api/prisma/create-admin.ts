// prisma/create-admin.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // ====== TỰ ĐỔI CHO PHÙ HỢP ======
  const adminLoginId = 'superadmin';             // login_id để đăng nhập
  const adminEmail = 'admin@example.com';        // email của admin
  const plainPassword = 'Admin12345';             // mật khẩu BẠN muốn dùng
  // =================================

  console.log('Đang kiểm tra admin tồn tại...');

  const existing = await prisma.admin.findFirst({
    where: {
      OR: [
        { admin_login_id: adminLoginId },
        { email: adminEmail },
      ],
    },
  });

  if (existing) {
    console.log('❗ Admin đã tồn tại với login_id hoặc email này:');
    console.log(existing);
    return;
  }

  console.log('Chưa có admin, bắt đầu tạo mới...');

  const hash = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.admin.create({
    data: {
      admin_uuid: randomUUID(),
      admin_login_id: adminLoginId,
      email: adminEmail,
      password: hash,
    },
  });

  console.log('✅ Tạo admin thành công!');
  console.log('Dùng thông tin sau để đăng nhập admin:');
  console.log(`  login_id hoặc email: ${adminLoginId} / ${adminEmail}`);
  console.log(`  mật khẩu:           ${plainPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
