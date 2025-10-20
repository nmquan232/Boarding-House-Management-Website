import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class ListUsageQuery {
  @IsOptional() @IsDateString()
  from?: string; // inclusive

  @IsOptional() @IsDateString()
  to?: string;   // inclusive

  @IsOptional() @IsInt() @Min(1)
  page?: number;

  @IsOptional() @IsInt() @Min(1)
  take?: number;
}
