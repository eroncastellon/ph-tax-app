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
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../common/decorators/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpenseResponseDto } from './dto/expense-response.dto';

@ApiTags('expenses')
@Controller('tax-profiles/:profileId/expenses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({
    summary: 'Add an expense item',
    description: `Add a business expense to the tax profile.

Expenses are only relevant if you chose the graduated rates tax regime.
Under 8% flat tax, you cannot deduct expenses (but your bookkeeping is simpler).

**Important:** Keep Official Receipts (OR) for all deductible expenses.`,
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 201,
    description: 'Expense added',
    type: ExpenseResponseDto,
  })
  async create(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.create(user.id, profileId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all expenses',
    description: 'Retrieves all expense items for a tax profile.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'List of expenses',
    type: [ExpenseResponseDto],
  })
  async findAll(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ): Promise<ExpenseResponseDto[]> {
    return this.expensesService.findAllByProfile(user.id, profileId);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get expense summary',
    description: 'Get aggregated expense statistics for a tax profile.',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiResponse({
    status: 200,
    description: 'Expense summary',
  })
  async getSummary(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
  ) {
    return this.expensesService.getSummary(user.id, profileId);
  }

  @Get(':expenseId')
  @ApiOperation({
    summary: 'Get expense by ID',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'expenseId', description: 'Expense item ID' })
  @ApiResponse({
    status: 200,
    description: 'Expense details',
    type: ExpenseResponseDto,
  })
  async findOne(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.findOne(user.id, profileId, expenseId);
  }

  @Put(':expenseId')
  @ApiOperation({
    summary: 'Update expense',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'expenseId', description: 'Expense item ID' })
  @ApiResponse({
    status: 200,
    description: 'Expense updated',
    type: ExpenseResponseDto,
  })
  async update(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ExpenseResponseDto> {
    return this.expensesService.update(user.id, profileId, expenseId, dto);
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete expense',
  })
  @ApiParam({ name: 'profileId', description: 'Tax profile ID' })
  @ApiParam({ name: 'expenseId', description: 'Expense item ID' })
  @ApiResponse({ status: 204, description: 'Expense deleted' })
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Param('profileId') profileId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<void> {
    await this.expensesService.remove(user.id, profileId, expenseId);
  }
}
