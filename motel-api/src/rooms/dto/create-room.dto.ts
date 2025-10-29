// src/rooms/dto/create-room.dto.ts
import { IsNotEmpty, IsOptional, IsInt, Min, IsNumberString } from 'class-validator';

export class CreateRoomDto {
  @IsNotEmpty({ message: 'Số phòng là bắt buộc' })
  room_number: string;

  @IsOptional()
  @IsNumberString({}, { message: 'Giá mặc định phải là số' })
  default_price?: string;

  @IsOptional()
  @IsInt({ message: 'Số người tối đa phải là số nguyên' })
  @Min(1, { message: 'Số người tối đa phải >= 1' })
  max_tenant?: number;
}
