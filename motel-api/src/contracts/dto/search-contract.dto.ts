// src/contracts/dto/search-contract.dto.ts
import { IsInt, IsOptional, IsString } from 'class-validator';

export class SearchContractDto {
  // Từ khoá tìm kiếm (tên người thuê, phòng, tòa)
  @IsOptional() @IsString()
  q?: string;

  // Số trang
  @IsOptional() @IsInt()
  page?: number;

  // Số lượng hiển thị mỗi trang
  @IsOptional() @IsInt()
  take?: number;

  // Lọc theo người thuê (khi bấm vào từ trang tenants)
  @IsOptional() @IsInt()
  tenant_id?: number;
}
