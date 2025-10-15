import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Get, Param, StreamableFile } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { createReadStream, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Express } from 'express';


@UseGuards(JwtAuthGuard)
@Controller('files')
export class UploadsController {
  @Post('apartment-image')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Chưa chọn file');

    const dir = join(process.cwd(), 'storage', 'apartments');
    mkdirSync(dir, { recursive: true });
    const safeName = Date.now() + '-' + file.originalname.replace(/[^\w.-]+/g, '_');
    const path = join(dir, safeName);

    writeFileSync(path, file.buffer);
    return { url: `/files/apartment-image/${safeName}` };
  }

  @Get('apartment-image/:name')
  getFile(@Param('name') name: string): StreamableFile {
    const path = join(process.cwd(), 'storage', 'apartments', name);
    const file = createReadStream(path);
    return new StreamableFile(file);
  }
}
