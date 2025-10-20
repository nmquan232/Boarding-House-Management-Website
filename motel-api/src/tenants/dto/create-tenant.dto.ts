import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString() @MaxLength(45)
  name: string;

  @IsOptional() @IsString() @MaxLength(45)
  tel?: string;

  @IsOptional() @IsString() @MaxLength(45)
  identity_card_number?: string;

  @IsOptional() @IsEmail() @MaxLength(256)
  email?: string;
}
