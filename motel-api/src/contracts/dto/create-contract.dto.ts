import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ContractMonthlyCostItemDto } from './contract-monthly-cost.dto';

export class CreateContractDto {
  @IsInt()
  apartment_room_id: number;

  @IsInt()
  tenant_id: number;

  @IsOptional() @IsInt() @Min(1)
  pay_period?: number;

  @IsString()
  price: string; // BigInt

  @IsOptional() @IsInt()
  electricity_pay_type_id?: number;

  @IsOptional() @IsString()
  electricity_price?: string; // BigInt

  @IsOptional() @IsInt()
  electricity_num_start?: number;

  @IsOptional() @IsInt()
  water_pay_type_id?: number;

  @IsOptional() @IsString()
  water_price?: string; // BigInt

  @IsOptional() @IsInt()
  water_number_start?: number;

  @IsOptional() @IsInt()
  number_of_tenant_current?: number;

  @IsOptional() @IsString()
  note?: string;

  @IsDateString()
  start_date: string;

  @IsOptional() @IsDateString()
  end_date?: string;

  @IsOptional() @IsArray()
  @Type(() => ContractMonthlyCostItemDto)
  monthly_costs?: ContractMonthlyCostItemDto[];
}
