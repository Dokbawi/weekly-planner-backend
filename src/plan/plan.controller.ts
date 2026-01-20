import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PlanService } from './plan.service';
import {
  CreateWeeklyPlanDto,
  CreateTaskDto,
  UpdateTaskDto,
  MoveTaskDto,
  UpdateMemoDto,
  ReorderTasksDto,
  WeeklyPlanResponseDto,
  TaskResponseDto,
  TodayResponseDto,
} from './dto/plan.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../common/interfaces/request-with-user.interface';
import { ApiResponse as ApiRes } from '../common/dto/api-response.dto';

@ApiTags('Weekly Plans')
@ApiBearerAuth()
@Controller('plans')
export class PlanController {
  constructor(private planService: PlanService) {}

  @Post()
  @ApiOperation({ summary: '주간 계획 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async createPlan(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWeeklyPlanDto,
  ): Promise<ApiRes<WeeklyPlanResponseDto>> {
    const plan = await this.planService.createWeeklyPlan(user.sub, dto);
    return ApiRes.ok(plan);
  }

  @Get()
  @ApiOperation({ summary: '전체 주간 계획 목록' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'size', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAllPlans(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: number,
    @Query('size') size?: number,
    @Query('status') status?: string,
  ): Promise<ApiRes<any>> {
    const plans = await this.planService.findAllByUser(user.sub, { page, size, status });
    return ApiRes.ok(plans);
  }

  @Get('current')
  @ApiOperation({ summary: '현재 주 계획 조회 (없으면 자동 생성)' })
  async getCurrentPlan(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiRes<WeeklyPlanResponseDto>> {
    const plan = await this.planService.getCurrentWeekPlan(user.sub);
    return ApiRes.ok(plan);
  }

  @Get('by-date')
  @ApiOperation({ summary: '날짜로 주간 계획 조회' })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15' })
  async getPlanByDate(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
  ): Promise<ApiRes<WeeklyPlanResponseDto | null>> {
    const plan = await this.planService.findByDate(date, user.sub);
    return ApiRes.ok(plan);
  }

  @Get(':planId')
  @ApiOperation({ summary: '특정 주간 계획 조회' })
  async getPlan(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
  ): Promise<ApiRes<WeeklyPlanResponseDto>> {
    const plan = await this.planService.findById(planId, user.sub);
    return ApiRes.ok(plan);
  }

  @Post(':planId/confirm')
  @ApiOperation({ summary: '계획 확정' })
  async confirmPlan(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
  ): Promise<ApiRes<WeeklyPlanResponseDto>> {
    const plan = await this.planService.confirmPlan(planId, user.sub);
    return ApiRes.ok(plan);
  }

  @Put(':planId/memo')
  @ApiOperation({ summary: '일일 메모 수정' })
  async updateDailyMemo(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Body() dto: UpdateMemoDto,
  ): Promise<ApiRes<WeeklyPlanResponseDto>> {
    const plan = await this.planService.updateDailyMemo(planId, user.sub, dto.date, dto.memo);
    return ApiRes.ok(plan);
  }

  @Post(':planId/tasks')
  @ApiOperation({ summary: 'Task 추가' })
  @ApiQuery({ name: 'date', required: true, example: '2024-01-15' })
  async addTask(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Query('date') date: string,
    @Body() dto: CreateTaskDto,
  ): Promise<ApiRes<TaskResponseDto>> {
    const task = await this.planService.addTask(planId, user.sub, date, dto);
    return ApiRes.ok(task);
  }

  @Put(':planId/tasks/:taskId')
  @ApiOperation({ summary: 'Task 수정' })
  async updateTask(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<ApiRes<TaskResponseDto>> {
    const task = await this.planService.updateTask(planId, user.sub, taskId, dto);
    return ApiRes.ok(task);
  }

  @Delete(':planId/tasks/:taskId')
  @ApiOperation({ summary: 'Task 삭제' })
  @ApiQuery({ name: 'reason', required: false })
  async deleteTask(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Query('reason') reason?: string,
  ): Promise<ApiRes<null>> {
    await this.planService.deleteTask(planId, user.sub, taskId, reason);
    return ApiRes.ok(null);
  }

  @Post(':planId/tasks/:taskId/move')
  @ApiOperation({ summary: 'Task 다른 날로 이동' })
  async moveTask(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
  ): Promise<ApiRes<TaskResponseDto>> {
    const task = await this.planService.moveTask(planId, user.sub, taskId, dto);
    return ApiRes.ok(task);
  }

  @Put(':planId/tasks/reorder')
  @ApiOperation({ summary: 'Task 순서 변경' })
  async reorderTasks(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Body() dto: ReorderTasksDto,
  ): Promise<ApiRes<null>> {
    await this.planService.reorderTasks(planId, user.sub, dto.date, dto.taskIds);
    return ApiRes.ok(null);
  }
}

@ApiTags('Today')
@ApiBearerAuth()
@Controller('today')
export class TodayController {
  constructor(private planService: PlanService) {}

  @Get()
  @ApiOperation({ summary: '오늘 할 일 조회' })
  async getToday(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiRes<TodayResponseDto>> {
    const today = await this.planService.getToday(user.sub);
    return ApiRes.ok(today);
  }
}
