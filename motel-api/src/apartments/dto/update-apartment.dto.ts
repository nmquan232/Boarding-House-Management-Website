// src/apartments/dto/update-apartment.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateApartmentDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @IsString()
  address?: string;        // gửi null thì đừng có key này (xem FE ở dưới)

  @IsOptional() @IsString()
  province_id?: string;

  @IsOptional() @IsString()
  district_id?: string;

  @IsOptional() @IsString()
  ward_id?: string;

  @IsOptional() @IsString()
  imagePath?: string;
}
