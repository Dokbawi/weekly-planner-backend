import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class RegisterRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;
}

export class LoginRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;
}

export class TokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 86400 })
  expiresIn: number;
}

export class UpdateSettingsDto {
  @ApiProperty({ example: 0, description: '계획 수립 요일 (0: Sunday, 6: Saturday)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  planningDay?: number;

  @ApiProperty({ example: 6, description: '회고 요일 (0: Sunday, 6: Saturday)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(6)
  reviewDay?: number;

  @ApiProperty({ example: 'Asia/Seoul', required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ example: 15, description: '기본 알림 시간 (분)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  defaultReminderMinutes?: number;

  @ApiProperty({ example: true, description: '알림 활성화 여부', required: false })
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;
}
