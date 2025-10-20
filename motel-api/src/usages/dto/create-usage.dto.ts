import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateUsageDto {
  @IsInt()
  @Min(0)
  usage_number: number;

  @IsDateString()
  input_date: string; // ISO date string: "2025-10-01T00:00:00Z" hoặc "2025-10-01"
}
