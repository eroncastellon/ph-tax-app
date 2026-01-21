import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { IncomeService } from './income.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { IncomeResponseDto } from './dto/income-response.dto';

@ApiTags('income')
@Controller('tax-profiles/:profileId/income')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post()
  @ApiOperation({
    summary: 'Add an income stream',
    description: `Add a new income source to the tax profile.

The app will automatically determine which BIR forms apply based on the income type.
You don't need to know which forms to file - just provide accurate income information.`,
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 201,
    description: 'Income stream added',
    type: IncomeResponseDto,
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Body() dto: CreateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomeService.create(user.id, profileId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all income streams',
    description: 'Retrieves all income streams for a tax profile.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'List of income streams',
    type: [IncomeResponseDto],
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ): Promise<IncomeResponseDto[]> {
    return this.incomeService.findAllByProfile(user.id, profileId);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get income summary',
    description: 'Get aggregated income statistics for a tax profile.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Income summary',
  })
  async getSummary(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    return this.incomeService.getSummary(user.id, profileId);
  }

  @Get(':incomeId')
  @ApiOperation({
    summary: 'Get income stream by ID',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'incomeId', description: 'Income stream ID' })
  @ApiResponse({
    status: 200,
    description: 'Income stream details',
    type: IncomeResponseDto,
  })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('incomeId') incomeId: string,
  ): Promise<IncomeResponseDto> {
    return this.incomeService.findOne(user.id, profileId, incomeId);
  }

  @Put(':incomeId')
  @ApiOperation({
    summary: 'Update income stream',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'incomeId', description: 'Income stream ID' })
  @ApiResponse({
    status: 200,
    description: 'Income stream updated',
    type: IncomeResponseDto,
  })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('incomeId') incomeId: string,
    @Body() dto: UpdateIncomeDto,
  ): Promise<IncomeResponseDto> {
    return this.incomeService.update(user.id, profileId, incomeId, dto);
  }

  @Delete(':incomeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete income stream',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'incomeId', description: 'Income stream ID' })
  @ApiResponse({ status: 204, description: 'Income stream deleted' })
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('incomeId') incomeId: string,
  ): Promise<void> {
    await this.incomeService.remove(user.id, profileId, incomeId);
  }
}
