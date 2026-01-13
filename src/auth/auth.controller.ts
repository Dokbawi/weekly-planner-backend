import { Controller, Post, Body, HttpCode, HttpStatus, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterRequestDto, LoginRequestDto, TokenResponseDto, UpdateSettingsDto } from './dto/auth.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { ApiResponse as ApiRes } from '../common/dto/api-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({ status: 201, description: '회원가입 성공' })
  @ApiResponse({ status: 409, description: '이미 존재하는 이메일' })
  async register(@Body() dto: RegisterRequestDto): Promise<ApiRes<UserResponseDto>> {
    const user = await this.authService.register(dto);
    return ApiRes.ok(user);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({ status: 200, description: '로그인 성공' })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() dto: LoginRequestDto): Promise<ApiRes<TokenResponseDto>> {
    const token = await this.authService.login(dto);
    return ApiRes.ok(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: '현재 사용자 정보 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  async getCurrentUser(@CurrentUser('sub') userId: string): Promise<ApiRes<UserResponseDto>> {
    const user = await this.authService.getCurrentUser(userId);
    return ApiRes.ok(user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('settings')
  @ApiBearerAuth()
  @ApiOperation({ summary: '사용자 설정 수정' })
  @ApiResponse({ status: 200, description: '수정 성공' })
  async updateSettings(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateSettingsDto,
  ): Promise<ApiRes<UserResponseDto>> {
    const user = await this.authService.updateSettings(userId, dto);
    return ApiRes.ok(user);
  }
}
