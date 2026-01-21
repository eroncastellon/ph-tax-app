import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaxProfileService } from './tax-profile.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';
import { TaxProfileResponseDto } from './dto/tax-profile-response.dto';

@ApiTags('tax-profiles')
@Controller('tax-profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaxProfileController {
  constructor(private readonly taxProfileService: TaxProfileService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new tax profile',
    description: 'Creates a tax profile for a specific tax year. Only one profile per tax year allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tax profile created successfully',
    type: TaxProfileResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Profile for this tax year already exists' })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateTaxProfileDto,
  ): Promise<TaxProfileResponseDto> {
    return this.taxProfileService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all tax profiles',
    description: 'Retrieves all tax profiles for the current user, ordered by tax year descending.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tax profiles',
    type: [TaxProfileResponseDto],
  })
  async findAll(@CurrentUser() user: CurrentUserData): Promise<TaxProfileResponseDto[]> {
    return this.taxProfileService.findAllByUser(user.id);
  }

  @Get('year/:year')
  @ApiOperation({
    summary: 'Get tax profile by year',
    description: 'Retrieves the tax profile for a specific tax year.',
  })
  @ApiParam({ name: 'year', example: 2024 })
  @ApiResponse({
    status: 200,
    description: 'Tax profile for the specified year',
    type: TaxProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No profile found for this tax year' })
  async findByYear(
    @CurrentUser() user: CurrentUserData,
    @Param('year') year: string,
  ): Promise<TaxProfileResponseDto | null> {
    return this.taxProfileService.findByYear(user.id, parseInt(year, 10));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get tax profile by ID',
  })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Tax profile details',
    type: TaxProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Tax profile not found' })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<TaxProfileResponseDto> {
    return this.taxProfileService.findOne(user.id, id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update tax profile',
    description: 'Updates a tax profile. Note: Tax regime cannot be changed after it is locked.',
  })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Tax profile updated successfully',
    type: TaxProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid update (e.g., regime already locked)' })
  @ApiResponse({ status: 404, description: 'Tax profile not found' })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: UpdateTaxProfileDto,
  ): Promise<TaxProfileResponseDto> {
    return this.taxProfileService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete tax profile',
    description: 'Deletes a tax profile and all associated data (income, expenses, assessments).',
  })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({ status: 204, description: 'Tax profile deleted' })
  @ApiResponse({ status: 404, description: 'Tax profile not found' })
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<void> {
    await this.taxProfileService.remove(user.id, id);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark tax profile as complete',
    description: 'Marks a tax profile as having all required information entered.',
  })
  @ApiParam({ name: 'id', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Tax profile marked as complete',
    type: TaxProfileResponseDto,
  })
  async markComplete(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ): Promise<TaxProfileResponseDto> {
    return this.taxProfileService.markComplete(user.id, id);
  }
}
