// src/contracts/dto/search-contract.dto.ts
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchContractDto {
  // Từ khoá tìm kiếm (tên người thuê, phòng, tòa)
  @IsOptional()
  @IsString()
  q?: string;

  // Số trang
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer number' })
  @Min(1)
  page: number = 1;

  // Số lượng hiển thị mỗi trang
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'take must be an integer number' })
  @Min(1)
  take: number = 10;

  // Lọc theo người thuê (khi bấm vào từ trang tenants)
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'tenant_id must be an integer number' })
  tenant_id?: number;
}
