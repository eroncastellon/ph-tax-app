import { Injectable } from '@nestjs/common';
import { RuleInput, RuleModule, Deadline, Obligation, FILING_DEADLINES } from '../types';

/**
 * DEADLINE CALCULATION RULE
 *
 * Calculates actual due dates for all tax obligations based on the tax year.
 * Handles weekend/holiday adjustments where applicable.
 *
 * [CPA VALIDATION REQUIRED] Deadline rules and holiday adjustments
 * should be validated against BIR issuances.
 *
 * Legal Basis:
 * - NIRC Section 249 (Interest on Late Payments)
 * - Various RRs on filing deadlines
 */
@Injectable()
export class DeadlineCalculationRule implements RuleModule {
  id = 'DEADLINE_CALCULATION';
  code = 'DEADLINE_CALC';
  version = '1.0.0';
  title = 'Tax Filing Deadline Calculator';

  execute(input: RuleInput, obligations: Obligation[]): Deadline[] {
    const deadlines: Deadline[] = [];
    let deadlineCounter = 1;

    const nextId = () => `DL-${deadlineCounter++}`;

    for (const obligation of obligations.filter((o) => o.isApplicable)) {
      const config = FILING_DEADLINES[obligation.formCode];

      if (obligation.frequency === 'quarterly' && config?.quarterDeadlines) {
        // Generate quarterly deadlines
        const quarters = ['Q1', 'Q2', 'Q3'] as const;

        for (const quarter of quarters) {
          const deadlineConfig = config.quarterDeadlines[quarter];
          if (!deadlineConfig) continue;

          const dueDate = this.calculateDueDate(
            input.taxYear,
            deadlineConfig.month,
            deadlineConfig.day,
            quarter,
          );

          deadlines.push({
            id: nextId(),
            obligationId: obligation.id,
            formCode: obligation.formCode,
            description: `${obligation.formName} - ${quarter} ${input.taxYear}`,
            dueDate: dueDate.toISOString().split('T')[0],
            period: `${quarter} ${input.taxYear}`,
            reminderDays: [30, 14, 7, 3, 1], // Days before due date
            penaltyInfo: this.getPenaltyInfo(obligation.formCode),
          });
        }
      }

      if (obligation.frequency === 'annual' || config?.annualDeadline) {
        const annualConfig = config?.annualDeadline || { month: 4, day: 15 };

        // Annual deadline is typically in the following year
        const dueDate = this.calculateDueDate(
          input.taxYear + 1, // Next year
          annualConfig.month,
          annualConfig.day,
          'ANNUAL',
        );

        deadlines.push({
          id: nextId(),
          obligationId: obligation.id,
          formCode: obligation.formCode,
          description: `${obligation.formName} - Tax Year ${input.taxYear}`,
          dueDate: dueDate.toISOString().split('T')[0],
          period: `Annual ${input.taxYear}`,
          reminderDays: [60, 30, 14, 7, 3, 1],
          penaltyInfo: this.getPenaltyInfo(obligation.formCode),
        });
      }

      // Special handling for registration fee (Form 0605)
      if (obligation.formCode === '0605') {
        const dueDate = new Date(input.taxYear, 0, 31); // January 31
        deadlines.push({
          id: nextId(),
          obligationId: obligation.id,
          formCode: '0605',
          description: `Annual Registration Fee - ${input.taxYear}`,
          dueDate: this.adjustForWeekend(dueDate).toISOString().split('T')[0],
          period: `${input.taxYear}`,
          reminderDays: [30, 14, 7],
          penaltyInfo: 'Late registration may result in penalties and surcharges.',
        });
      }

      // Special handling for registration (Form 1901)
      if (obligation.formCode === '1901') {
        // Registration should be done within 30 days of starting business
        // For guidance, we'll set a reminder but no fixed deadline
        deadlines.push({
          id: nextId(),
          obligationId: obligation.id,
          formCode: '1901',
          description: 'BIR Registration - Within 30 days of starting business',
          dueDate: 'ASAP',
          period: 'Before business starts',
          reminderDays: [],
          penaltyInfo: 'Operating without BIR registration may result in penalties, surcharges, and possible criminal liability.',
        });
      }
    }

    // Sort by due date
    return deadlines.sort((a, b) => {
      if (a.dueDate === 'ASAP') return -1;
      if (b.dueDate === 'ASAP') return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  /**
   * Calculate due date with adjustments
   * [CPA VALIDATION REQUIRED] Holiday adjustments may vary
   */
  private calculateDueDate(
    year: number,
    month: number,
    day: number,
    period: string,
  ): Date {
    // Month is 1-indexed in config, 0-indexed in JS Date
    let dueDate = new Date(year, month - 1, day);

    // If Q4 percentage tax, it's due in January of NEXT year
    if (period === 'Q4') {
      dueDate = new Date(year + 1, month - 1, day);
    }

    // Adjust for weekends (if due date falls on Saturday/Sunday, move to next Monday)
    return this.adjustForWeekend(dueDate);
  }

  /**
   * Adjust date if it falls on a weekend
   * [CPA VALIDATION REQUIRED] This is standard practice but should be confirmed
   */
  private adjustForWeekend(date: Date): Date {
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) {
      // Sunday -> Monday
      date.setDate(date.getDate() + 1);
    } else if (dayOfWeek === 6) {
      // Saturday -> Monday
      date.setDate(date.getDate() + 2);
    }

    return date;
  }

  /**
   * Get penalty information for late filing
   * [CPA VALIDATION REQUIRED] Penalty rates from NIRC Section 248-249
   */
  private getPenaltyInfo(formCode: string): string {
    // Standard penalties under NIRC
    const basePenalty = `
Late filing penalties:
• 25% surcharge on tax due (for late filing)
• 12% annual interest on unpaid tax
• Compromise penalty (varies by amount)

Note: Penalties compound, so file and pay on time to avoid additional charges.
    `.trim();

    // Form-specific notes
    const formSpecificNotes: Record<string, string> = {
      '1701Q': `${basePenalty}\n\nQuarterly returns help spread your tax payments throughout the year.`,
      '1701': `${basePenalty}\n\nAnnual return reconciles all quarterly payments. Any underpayment is due with this return.`,
      '2551Q': `${basePenalty}\n\nPercentage tax (3%) is separate from income tax.`,
      '0605': 'Late payment of registration fee may result in penalties and difficulty in processing future transactions with the BIR.',
    };

    return formSpecificNotes[formCode] || basePenalty;
  }

  getPlainLanguageExplanation() {
    return {
      summary: `Tax filing deadlines in the Philippines follow a regular schedule. Quarterly
        returns (1701Q, 2551Q) are typically due on the 15th or 25th of the month following
        the quarter. The annual return (1701) is due on April 15th of the following year.`,

      forBeginners: `Here's the simple version: File something every quarter (every 3 months)
        and once a year. The app will send you reminders before each deadline. If you miss
        a deadline, you'll have to pay extra fees (penalties), so try to file on time.
        If you can't pay everything, it's still better to file on time and pay what you can.`,

      examples: [
        {
          scenario: 'Q1 2024 income tax (Form 1701Q)',
          outcome: 'Due on May 15, 2024 (covers income from January-March 2024)',
        },
        {
          scenario: 'Annual return for Tax Year 2024',
          outcome: 'Due on April 15, 2025',
        },
        {
          scenario: 'Q4 2024 percentage tax (Form 2551Q)',
          outcome: 'Due on January 25, 2025 (covers sales from October-December 2024)',
        },
      ],
    };
  }
}
