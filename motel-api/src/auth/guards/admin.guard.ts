import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'ADMIN') {
      return true;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
  }
}

