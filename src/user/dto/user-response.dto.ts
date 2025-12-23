import { ApiProperty } from '@nestjs/swagger';

export class UserSettingsResponseDto {
  @ApiProperty({ example: 0 })
  planningDay: number;

  @ApiProperty({ example: 6 })
  reviewDay: number;

  @ApiProperty({ example: 30 })
  defaultReminderMinutes: number;

  @ApiProperty({ example: 'Asia/Seoul' })
  timezone: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ type: UserSettingsResponseDto })
  settings: UserSettingsResponseDto;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
