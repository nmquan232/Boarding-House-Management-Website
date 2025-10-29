import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Kiểm tra “plain object”
function isPlainObject(val: any) {
  return Object.prototype.toString.call(val) === '[object Object]';
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

// Chuyển BigInt sâu toàn bộ object/array
function deepConvertBigInt(value: any): any {
  if (value === null || value === undefined) return value;

  // Tránh can thiệp stream/buffer
  if (value instanceof Buffer) return value;
  // StreamableFile thường có body là Readable/Buffer; interceptor không động vào res file

  const t = typeof value;

  if (t === 'bigint') {
    // Nếu an toàn, trả number; nếu không, trả string
    return value <= MAX_SAFE && value >= -MAX_SAFE ? Number(value) : value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(deepConvertBigInt);
  }

  if (isPlainObject(value)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = deepConvertBigInt(v);
    }
    return out;
  }

  return value;
}

@Injectable()
export class BigIntSerializationInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => deepConvertBigInt(data)));
  }
}
