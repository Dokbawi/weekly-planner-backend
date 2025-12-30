import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RegisterRequestDto, LoginRequestDto, TokenResponseDto, UpdateSettingsDto } from './dto/auth.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';

@Injectable()
export class AuthService {
  private readonly expiresIn: number;

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    const expirationConfig = this.configService.get<string>('JWT_EXPIRATION', '24h');
    this.expiresIn = this.parseExpiration(expirationConfig);
  }

  private parseExpiration(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's': return value * 1000; // seconds to ms
      case 'm': return value * 60 * 1000; // minutes to ms
      case 'h': return value * 60 * 60 * 1000; // hours to ms
      case 'd': return value * 24 * 60 * 60 * 1000; // days to ms
      default: return 86400000; // default 24 hours
    }
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

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponse(user);
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto): Promise<UserResponseDto> {
    const user = await this.userService.updateSettings(userId, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toUserResponse(user);
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
        notificationEnabled: user.settings?.notificationEnabled ?? true,
      },
      createdAt: user.createdAt,
    };
  }
}
