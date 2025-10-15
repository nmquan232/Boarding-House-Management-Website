import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(45)
  room_number: string;

  // BigInt trên Prisma => string/number đều được -> ta nhận string để an toàn số lớn
  @IsOptional()
  default_price?: string; // FE có thể gửi "2500000"

  @IsOptional()
  @IsInt()
  max_tenant?: number;
}
