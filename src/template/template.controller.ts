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
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  CreateTemplateFromPlanDto,
  ApplyTemplateDto,
  WeeklyTemplateResponseDto,
} from './dto/template.dto';
import { CurrentUser } from '../changelog/common/decorators/current-user.decorator';
import { JwtPayload } from '../changelog/common/interfaces/request-with-user.interface';
import { ApiResponse as ApiRes } from '../changelog/common/dto/api-response.dto';

@ApiTags('Weekly Templates')
@ApiBearerAuth()
@Controller('templates')
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @Post()
  @ApiOperation({ summary: '템플릿 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTemplateDto,
  ): Promise<ApiRes<WeeklyTemplateResponseDto>> {
    const template = await this.templateService.create(user.sub, dto);
    return ApiRes.ok(template);
  }

  @Get()
  @ApiOperation({ summary: '템플릿 목록 조회' })
  async findAll(
    @CurrentUser() user: JwtPayload,
  ): Promise<ApiRes<WeeklyTemplateResponseDto[]>> {
    const templates = await this.templateService.findAll(user.sub);
    return ApiRes.ok(templates);
  }

  @Get(':id')
  @ApiOperation({ summary: '템플릿 상세 조회' })
  async findById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ApiRes<WeeklyTemplateResponseDto>> {
    const template = await this.templateService.findById(id, user.sub);
    return ApiRes.ok(template);
  }

  @Put(':id')
  @ApiOperation({ summary: '템플릿 수정' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ): Promise<ApiRes<WeeklyTemplateResponseDto>> {
    const template = await this.templateService.update(id, user.sub, dto);
    return ApiRes.ok(template);
  }

  @Delete(':id')
  @ApiOperation({ summary: '템플릿 삭제' })
  async delete(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ApiRes<null>> {
    await this.templateService.delete(id, user.sub);
    return ApiRes.ok(null);
  }

  @Post('from-plan/:planId')
  @ApiOperation({ summary: '기존 계획에서 템플릿 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  async createFromPlan(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Body() dto: CreateTemplateFromPlanDto,
  ): Promise<ApiRes<WeeklyTemplateResponseDto>> {
    const template = await this.templateService.createFromPlan(planId, user.sub, dto);
    return ApiRes.ok(template);
  }
}

@ApiTags('Weekly Plans')
@ApiBearerAuth()
@Controller('plans')
export class ApplyTemplateController {
  constructor(private templateService: TemplateService) {}

  @Post(':planId/apply-template/:templateId')
  @ApiOperation({ summary: '계획에 템플릿 적용' })
  async applyTemplate(
    @CurrentUser() user: JwtPayload,
    @Param('planId') planId: string,
    @Param('templateId') templateId: string,
    @Body() dto: ApplyTemplateDto,
  ): Promise<ApiRes<null>> {
    await this.templateService.applyTemplate(planId, templateId, user.sub, dto.mode);
    return ApiRes.ok(null);
  }
}
