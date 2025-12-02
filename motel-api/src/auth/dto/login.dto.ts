import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Email hoặc login ID không được để trống' })
  email: string; // Có thể là email hoặc admin_login_id

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(64, { message: 'Mật khẩu không được vượt quá 64 ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })

  password: string;
}
