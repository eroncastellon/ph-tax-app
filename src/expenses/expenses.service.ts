import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaxProfileService } from '../tax-profile/tax-profile.service';
import { ExpenseItem, ExpenseCategory } from '@prisma/client';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxProfileService: TaxProfileService,
  ) {}

  /**
   * Add an expense item to a tax profile
   */
  async create(userId: string, taxProfileId: string, dto: CreateExpenseDto): Promise<ExpenseItem> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    // Auto-determine deductibility based on category
    // [CPA VALIDATION REQUIRED] These rules should be validated
    const deductibilityNote = this.getDeductibilityNote(dto.category);

    return this.prisma.expenseItem.create({
      data: {
        taxProfileId,
        category: dto.category as ExpenseCategory,
        description: dto.description,
        amount: new Decimal(dto.amount),
        dateIncurred: new Date(dto.dateIncurred),
        hasReceipt: dto.hasReceipt || false,
        receiptReference: dto.receiptReference,
        vendorName: dto.vendorName,
        vendorTin: dto.vendorTin,
        isDeductible: dto.isDeductible !== undefined ? dto.isDeductible : true,
        deductibilityNote: dto.deductibilityNote || deductibilityNote,
      },
    });
  }

  /**
   * Get all expenses for a tax profile
   */
  async findAllByProfile(userId: string, taxProfileId: string): Promise<ExpenseItem[]> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    return this.prisma.expenseItem.findMany({
      where: { taxProfileId },
      orderBy: { dateIncurred: 'desc' },
    });
  }

  /**
   * Get a specific expense item
   */
  async findOne(userId: string, taxProfileId: string, expenseId: string): Promise<ExpenseItem> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    const expense = await this.prisma.expenseItem.findFirst({
      where: {
        id: expenseId,
        taxProfileId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense item not found');
    }

    return expense;
  }

  /**
   * Update an expense item
   */
  async update(
    userId: string,
    taxProfileId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseItem> {
    await this.findOne(userId, taxProfileId, expenseId);

    const updateData: any = { ...dto };

    if (dto.amount !== undefined) {
      updateData.amount = new Decimal(dto.amount);
    }

    if (dto.dateIncurred !== undefined) {
      updateData.dateIncurred = new Date(dto.dateIncurred);
    }

    return this.prisma.expenseItem.update({
      where: { id: expenseId },
      data: updateData,
    });
  }

  /**
   * Delete an expense item
   */
  async remove(userId: string, taxProfileId: string, expenseId: string): Promise<void> {
    await this.findOne(userId, taxProfileId, expenseId);

    await this.prisma.expenseItem.delete({
      where: { id: expenseId },
    });
  }

  /**
   * Get expense summary for a tax profile
   */
  async getSummary(userId: string, taxProfileId: string) {
    await this.taxProfileService.findOne(userId, taxProfileId);

    const expenses = await this.prisma.expenseItem.findMany({
      where: { taxProfileId },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const deductibleExpenses = expenses
      .filter((e) => e.isDeductible)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const nonDeductibleExpenses = expenses
      .filter((e) => !e.isDeductible)
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const byCategory = expenses.reduce(
      (acc, e) => {
        const cat = e.category;
        if (!acc[cat]) {
          acc[cat] = { count: 0, total: 0, deductible: 0 };
        }
        acc[cat].count++;
        acc[cat].total += Number(e.amount);
        if (e.isDeductible) {
          acc[cat].deductible += Number(e.amount);
        }
        return acc;
      },
      {} as Record<string, { count: number; total: number; deductible: number }>,
    );

    const withoutReceipts = expenses.filter((e) => !e.hasReceipt);

    return {
      totalItems: expenses.length,
      totalExpenses,
      deductibleExpenses,
      nonDeductibleExpenses,
      byCategory,
      itemsWithoutReceipts: withoutReceipts.length,
      warning: withoutReceipts.length > 0
        ? `${withoutReceipts.length} expense(s) have no receipts. These may be disallowed during audit.`
        : null,
      cpaNote: '[CPA VALIDATION REQUIRED] Deductibility of expenses depends on proper documentation and compliance with BIR requirements.',
    };
  }

  /**
   * Get deductibility guidance for expense categories
   * [CPA VALIDATION REQUIRED]
   */
  private getDeductibilityNote(category: string): string {
    const notes: Record<string, string> = {
      RENT: 'Rent expense is deductible if for business premises. Personal rent is not deductible.',
      UTILITIES: 'Utilities are deductible if used for business. If home-based, apply reasonable allocation.',
      SUPPLIES: 'Office supplies are generally deductible with proper receipts.',
      PROFESSIONAL_FEES: 'Fees paid to professionals (lawyers, accountants) are deductible.',
      TRANSPORTATION: 'Business travel is deductible. Personal commute is not.',
      COMMUNICATION: 'Business phone/internet is deductible. Personal use portion is not.',
      DEPRECIATION: '[CPA VALIDATION REQUIRED] Depreciation must follow BIR-approved methods and rates.',
      SALARIES_WAGES: 'Salaries are deductible if properly reported and withholding taxes remitted.',
      TAXES_LICENSES: 'Business taxes and licenses are deductible. Income tax is not.',
      INSURANCE: 'Business insurance premiums are deductible.',
      INTEREST_EXPENSE: 'Interest on business loans is deductible, subject to thin capitalization rules.',
      REPAIRS_MAINTENANCE: 'Ordinary repairs are deductible. Capital improvements must be depreciated.',
      ADVERTISING: 'Advertising and marketing expenses are generally deductible.',
      BAD_DEBTS: '[CPA VALIDATION REQUIRED] Bad debts require specific documentation and write-off procedures.',
      OTHER_DEDUCTIBLE: 'Other expenses may be deductible if ordinary and necessary for business.',
    };

    return notes[category] || 'Verify deductibility with a CPA.';
  }
}
