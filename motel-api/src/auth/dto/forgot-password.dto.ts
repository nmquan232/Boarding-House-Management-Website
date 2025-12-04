import { IsString, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
    @IsString()
    @IsNotEmpty({ message: 'Email hoặc login ID không được để trống' })
    identifier: string;
}

