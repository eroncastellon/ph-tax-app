import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaxProfileService } from '../tax-profile/tax-profile.service';
import { IncomeStream, IncomeType, IncomeFrequency } from '@prisma/client';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class IncomeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxProfileService: TaxProfileService,
  ) {}

  /**
   * Add an income stream to a tax profile
   */
  async create(userId: string, taxProfileId: string, dto: CreateIncomeDto): Promise<IncomeStream> {
    // Verify ownership of tax profile
    await this.taxProfileService.findOne(userId, taxProfileId);

    return this.prisma.incomeStream.create({
      data: {
        taxProfileId,
        incomeType: dto.incomeType as IncomeType,
        description: dto.description,
        clientName: dto.clientName,
        grossAmount: new Decimal(dto.grossAmount),
        frequency: (dto.frequency as IncomeFrequency) || IncomeFrequency.ONE_TIME,
        periodStart: dto.periodStart ? new Date(dto.periodStart) : null,
        periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : null,
        hasWithholding: dto.hasWithholding || false,
        withheldAmount: dto.withheldAmount ? new Decimal(dto.withheldAmount) : null,
        withholdingRate: dto.withholdingRate ? new Decimal(dto.withholdingRate) : null,
        form2307Received: dto.form2307Received || false,
        form2307Reference: dto.form2307Reference,
      },
    });
  }

  /**
   * Get all income streams for a tax profile
   */
  async findAllByProfile(userId: string, taxProfileId: string): Promise<IncomeStream[]> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    return this.prisma.incomeStream.findMany({
      where: { taxProfileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a specific income stream
   */
  async findOne(userId: string, taxProfileId: string, incomeId: string): Promise<IncomeStream> {
    await this.taxProfileService.findOne(userId, taxProfileId);

    const income = await this.prisma.incomeStream.findFirst({
      where: {
        id: incomeId,
        taxProfileId,
      },
    });

    if (!income) {
      throw new NotFoundException('Income stream not found');
    }

    return income;
  }

  /**
   * Update an income stream
   */
  async update(
    userId: string,
    taxProfileId: string,
    incomeId: string,
    dto: UpdateIncomeDto,
  ): Promise<IncomeStream> {
    await this.findOne(userId, taxProfileId, incomeId);

    const updateData: any = { ...dto };

    // Convert numeric fields to Decimal
    if (dto.grossAmount !== undefined) {
      updateData.grossAmount = new Decimal(dto.grossAmount);
    }
    if (dto.withheldAmount !== undefined) {
      updateData.withheldAmount = dto.withheldAmount ? new Decimal(dto.withheldAmount) : null;
    }
    if (dto.withholdingRate !== undefined) {
      updateData.withholdingRate = dto.withholdingRate ? new Decimal(dto.withholdingRate) : null;
    }

    // Convert date fields
    if (dto.periodStart !== undefined) {
      updateData.periodStart = dto.periodStart ? new Date(dto.periodStart) : null;
    }
    if (dto.periodEnd !== undefined) {
      updateData.periodEnd = dto.periodEnd ? new Date(dto.periodEnd) : null;
    }

    return this.prisma.incomeStream.update({
      where: { id: incomeId },
      data: updateData,
    });
  }

  /**
   * Delete an income stream
   */
  async remove(userId: string, taxProfileId: string, incomeId: string): Promise<void> {
    await this.findOne(userId, taxProfileId, incomeId);

    await this.prisma.incomeStream.delete({
      where: { id: incomeId },
    });
  }

  /**
   * Get income summary for a tax profile
   */
  async getSummary(userId: string, taxProfileId: string) {
    await this.taxProfileService.findOne(userId, taxProfileId);

    const incomes = await this.prisma.incomeStream.findMany({
      where: { taxProfileId },
    });

    const totalGross = incomes.reduce(
      (sum, i) => sum + Number(i.grossAmount),
      0,
    );

    const totalWithheld = incomes
      .filter((i) => i.hasWithholding)
      .reduce((sum, i) => sum + Number(i.withheldAmount || 0), 0);

    const byType = incomes.reduce(
      (acc, i) => {
        const type = i.incomeType;
        if (!acc[type]) {
          acc[type] = { count: 0, total: 0 };
        }
        acc[type].count++;
        acc[type].total += Number(i.grossAmount);
        return acc;
      },
      {} as Record<string, { count: number; total: number }>,
    );

    const missing2307Count = incomes.filter(
      (i) => i.hasWithholding && !i.form2307Received,
    ).length;

    return {
      totalStreams: incomes.length,
      totalGrossIncome: totalGross,
      totalWithheld,
      netIncome: totalGross - totalWithheld,
      byType,
      missing2307Count,
      warning: missing2307Count > 0
        ? `${missing2307Count} income stream(s) have withholding but no Form 2307 received.`
        : null,
    };
  }
}
