import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // chắc chắn là string
    });
  }

  // Hàm validate() trả về dữ liệu được gắn vào req.user
  async validate(payload: { sub: number; email: string; name: string; role: 'USER' | 'ADMIN' }) {
    return { userId: payload.sub, email: payload.email, name: payload.name, role: payload.role };
  }
}
