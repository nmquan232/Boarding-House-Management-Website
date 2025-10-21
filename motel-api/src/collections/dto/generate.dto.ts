import { IsDateString, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class GenerateCollectionDto {
  @IsInt()
  contract_id: number;

  // Kỳ tính dạng YYYY-MM (VD: "2025-10")
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'period phải là YYYY-MM' })
  period: string;

  // Optional: cho phép chọn ngày chốt khác trong tháng
  @IsOptional() @IsDateString()
  charge_date?: string; // default = end of month
}
