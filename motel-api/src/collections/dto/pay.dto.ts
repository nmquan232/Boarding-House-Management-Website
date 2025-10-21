import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class PayDto {
  // BigInt an toàn → FE gửi string
  @IsString()
  @Matches(/^\d+$/, { message: 'amount phải là số nguyên không dấu' })
  amount: string;

  @IsOptional() @IsDateString()
  paid_date?: string; // default = now()
}
