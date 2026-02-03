import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../changelog/common/interfaces/request-with-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'your-256-bit-secret-key-here-minimum-32-chars',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // JWT 자체가 서명으로 검증되므로 매 요청마다 DB 조회 불필요
    // 토큰에 포함된 payload를 그대로 반환 (성능 최적화)
    // 사용자 삭제 케이스는 토큰 만료로 처리
    return payload;
  }
}
