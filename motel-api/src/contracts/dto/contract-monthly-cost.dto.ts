import { IsInt, IsOptional, IsString } from 'class-validator';

export class ContractMonthlyCostItemDto {
  @IsInt()
  monthly_cost_id: number;

  @IsOptional()
  @IsInt()
  pay_type?: number; // 1=cố định, 2=theo người... tùy bạn dùng

  // dùng string cho BigInt an toàn
  @IsString()
  price: string;
}
