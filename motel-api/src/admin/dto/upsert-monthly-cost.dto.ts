import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpsertMonthlyCostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(45)
  name: string;
}

