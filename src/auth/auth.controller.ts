import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterRequestDto, LoginRequestDto, TokenResponseDto } from './dto/auth.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { ApiResponse as ApiRes } from '../common/dto/api-response.dto';
import { Public } from '../common/decorators/public.decorator';

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
}
