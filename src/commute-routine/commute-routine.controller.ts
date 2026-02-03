import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommuteRoutineService } from './commute-routine.service';
import {
  CreateCommuteRoutineDto,
  UpdateCommuteRoutineDto,
  CalculateDepartureDto,
  CommuteRoutineResponseDto,
  CalculateResultDto,
} from './dto/commute-routine.dto';
import { CurrentUser } from '../changelog/common/decorators/current-user.decorator';
import { JwtPayload } from '../changelog/common/interfaces/request-with-user.interface';
import { ApiResponse as ApiRes } from '../changelog/common/dto/api-response.dto';

@ApiTags('Commute Routines')
@ApiBearerAuth()
@Controller('commute-routines')
export class CommuteRoutineController {
  constructor(private commuteRoutineService: CommuteRoutineService) {}

  @Post()
  @ApiOperation({ summary: '출퇴근 루틴 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCommuteRoutineDto,
  ): Promise<ApiRes<CommuteRoutineResponseDto>> {
    const routine = await this.commuteRoutineService.create(user.sub, dto);
    return ApiRes.ok(routine);
  }

  @Get()
  @ApiOperation({ summary: '출퇴근 루틴 목록 조회' })
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiRes<CommuteRoutineResponseDto[]>> {
    const routines = await this.commuteRoutineService.findAll(user.sub);
    return ApiRes.ok(routines);
  }

  @Get(':routineId')
  @ApiOperation({ summary: '특정 출퇴근 루틴 조회' })
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('routineId') routineId: string,
  ): Promise<ApiRes<CommuteRoutineResponseDto>> {
    const routine = await this.commuteRoutineService.findById(routineId, user.sub);
    return ApiRes.ok(routine);
  }

  @Put(':routineId')
  @ApiOperation({ summary: '출퇴근 루틴 수정' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('routineId') routineId: string,
    @Body() dto: UpdateCommuteRoutineDto,
  ): Promise<ApiRes<CommuteRoutineResponseDto>> {
    const routine = await this.commuteRoutineService.update(
      routineId,
      user.sub,
      dto,
    );
    return ApiRes.ok(routine);
  }

  @Delete(':routineId')
  @ApiOperation({ summary: '출퇴근 루틴 삭제' })
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('routineId') routineId: string,
  ): Promise<ApiRes<null>> {
    await this.commuteRoutineService.delete(routineId, user.sub);
    return ApiRes.ok(null);
  }

  @Post(':routineId/calculate')
  @ApiOperation({ summary: '출발 시간 계산' })
  async calculate(
    @CurrentUser() user: JwtPayload,
    @Param('routineId') routineId: string,
    @Body() dto: CalculateDepartureDto,
  ): Promise<ApiRes<CalculateResultDto>> {
    const result = await this.commuteRoutineService.calculate(
      routineId,
      user.sub,
      dto.arrivalTime,
      dto.offsetMinutes ?? 0,
    );
    return ApiRes.ok(result);
  }
}
