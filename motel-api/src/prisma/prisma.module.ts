import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Module toàn cục, có thể inject ở bất kỳ đâu
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
