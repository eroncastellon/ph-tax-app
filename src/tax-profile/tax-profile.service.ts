import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TaxProfile, UserType, RegistrationStatus, TaxRegime } from '@prisma/client';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';

@Injectable()
export class TaxProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tax profile for a specific tax year
   */
  async create(userId: string, dto: CreateTaxProfileDto): Promise<TaxProfile> {
    // Check if profile already exists for this tax year
    const existing = await this.prisma.taxProfile.findUnique({
      where: {
        userId_taxYear: {
          userId,
          taxYear: dto.taxYear,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tax profile for year ${dto.taxYear} already exists`);
    }

    // Validate tax year
    const currentYear = new Date().getFullYear();
    if (dto.taxYear < 2018 || dto.taxYear > currentYear + 1) {
      throw new BadRequestException(
        `Tax year must be between 2018 and ${currentYear + 1}`,
      );
    }

    return this.prisma.taxProfile.create({
      data: {
        userId,
        taxYear: dto.taxYear,
        userType: dto.userType as UserType,
        registrationStatus: (dto.registrationStatus as RegistrationStatus) || RegistrationStatus.NOT_REGISTERED,
        tin: dto.tin,
        rdo: dto.rdo,
        rdoName: dto.rdoName,
        dateRegistered: dto.dateRegistered ? new Date(dto.dateRegistered) : null,
        businessName: dto.businessName,
        businessAddress: dto.businessAddress,
        businessType: dto.businessType,
        hasEmploymentIncome: dto.hasEmploymentIncome || false,
        employerName: dto.employerName,
        employerTin: dto.employerTin,
        selectedRegime: (dto.selectedRegime as TaxRegime) || TaxRegime.UNDETERMINED,
      },
    });
  }

  /**
   * Get all tax profiles for a user
   */
  async findAllByUser(userId: string): Promise<TaxProfile[]> {
    return this.prisma.taxProfile.findMany({
      where: { userId },
      orderBy: { taxYear: 'desc' },
      include: {
        incomeStreams: true,
        expenses: true,
        assessmentResults: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Get a specific tax profile
   */
  async findOne(userId: string, profileId: string): Promise<TaxProfile> {
    const profile = await this.prisma.taxProfile.findFirst({
      where: {
        id: profileId,
        userId,
      },
      include: {
        incomeStreams: true,
        expenses: true,
        assessmentResults: {
          orderBy: { assessedAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Tax profile not found');
    }

    return profile;
  }

  /**
   * Get tax profile by year
   */
  async findByYear(userId: string, taxYear: number): Promise<TaxProfile | null> {
    return this.prisma.taxProfile.findUnique({
      where: {
        userId_taxYear: {
          userId,
          taxYear,
        },
      },
      include: {
        incomeStreams: true,
        expenses: true,
        assessmentResults: {
          orderBy: { assessedAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Update a tax profile
   */
  async update(userId: string, profileId: string, dto: UpdateTaxProfileDto): Promise<TaxProfile> {
    const profile = await this.findOne(userId, profileId);

    // Check if regime is being changed after it was locked
    if (dto.selectedRegime && profile.regimeLockedAt) {
      throw new BadRequestException(
        'Tax regime cannot be changed after it has been locked. This happens after filing your first quarterly return.',
      );
    }

    const updateData: any = { ...dto };

    // Lock regime if being set for the first time (not UNDETERMINED)
    if (dto.selectedRegime && dto.selectedRegime !== 'UNDETERMINED' && !profile.regimeLockedAt) {
      updateData.regimeLockedAt = new Date();
    }

    // Convert date string to Date if provided
    if (dto.dateRegistered) {
      updateData.dateRegistered = new Date(dto.dateRegistered);
    }

    return this.prisma.taxProfile.update({
      where: { id: profileId },
      data: updateData,
    });
  }

  /**
   * Delete a tax profile
   */
  async remove(userId: string, profileId: string): Promise<void> {
    await this.findOne(userId, profileId); // Verify ownership

    await this.prisma.taxProfile.delete({
      where: { id: profileId },
    });
  }

  /**
   * Mark profile as complete
   */
  async markComplete(userId: string, profileId: string): Promise<TaxProfile> {
    await this.findOne(userId, profileId);

    return this.prisma.taxProfile.update({
      where: { id: profileId },
      data: { isComplete: true },
    });
  }

  /**
   * Get current tax year profile or create one
   */
  async getOrCreateCurrent(userId: string, userType: UserType): Promise<TaxProfile> {
    const currentYear = new Date().getFullYear();

    let profile = await this.findByYear(userId, currentYear);

    if (!profile) {
      profile = await this.create(userId, {
        taxYear: currentYear,
        userType: userType as string,
      });
    }

    return profile;
  }
}
