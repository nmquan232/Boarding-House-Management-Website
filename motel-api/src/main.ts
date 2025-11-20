import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { BigIntSerializationInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Bật ValidationPipe toàn cục
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // loại bỏ các field không có trong DTO
    forbidNonWhitelisted: true, // báo lỗi nếu gửi field thừa
    transform: true, // tự động chuyển type theo DTO
    transformOptions: {
      enableImplicitConversion: true, // tự động convert type
    },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => {
        const constraints = Object.values(error.constraints || {});
        return `${error.property}: ${constraints.join(', ')}`;
      });
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
        details: errors,
      });
    },
  }));

  // ✅ BigInt -> number/string toàn cục
  app.useGlobalInterceptors(new BigIntSerializationInterceptor());

  // Bật CORS
  app.enableCors({
    origin: 'http://localhost:5173', // frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // nếu cần cookie/token
  });

  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);

  await app.listen(3000);
}
bootstrap();
