import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  @MaxLength(45)
  name: string;

  @IsOptional() @IsString()
  province_id?: string;

  @IsOptional() @IsString()
  district_id?: string;

  @IsOptional() @IsString()
  ward_id?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  imagePath?: string; // đường dẫn ảnh sau khi upload (FE gửi lên)
}

