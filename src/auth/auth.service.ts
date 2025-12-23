import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RegisterRequestDto, LoginRequestDto, TokenResponseDto } from './dto/auth.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.expiresIn = this.configService.get<number>('JWT_EXPIRATION', 86400000);
  }

  async register(dto: RegisterRequestDto): Promise<UserResponseDto> {
    const user = await this.userService.create(dto.email, dto.password, dto.name);
    return this.toUserResponse(user);
  }

  async login(dto: LoginRequestDto): Promise<TokenResponseDto> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.userService.validatePassword(user, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(this.expiresIn / 1000),
    };
  }

  private toUserResponse(user: any): UserResponseDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      settings: {
        planningDay: user.settings?.planningDay ?? 0,
        reviewDay: user.settings?.reviewDay ?? 6,
        defaultReminderMinutes: user.settings?.defaultReminderMinutes ?? 30,
        timezone: user.settings?.timezone ?? 'Asia/Seoul',
      },
      createdAt: user.createdAt,
    };
  }
}
