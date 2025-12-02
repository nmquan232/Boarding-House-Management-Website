import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'Mật khẩu cũ không được để trống' })
    oldPassword: string;

    @IsString()
    @MinLength(6, { message: 'Mật khẩu mới phải có ít nhất 6 ký tự' })
    @MaxLength(64, { message: 'Mật khẩu mới không được vượt quá 64 ký tự' })
    @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
    newPassword: string;
}

