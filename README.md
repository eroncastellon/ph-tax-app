# Philippine Tax Guidance API

A beginner-first tax guidance API for Philippine taxpayers. Built with NestJS, PostgreSQL, and a deterministic rules engine.

> ⚠️ **[CPA VALIDATION REQUIRED]** All tax rules, thresholds, and computations in this codebase require validation by a licensed Certified Public Accountant before production use.

## Key Concepts

### Deterministic Rules Engine
Tax calculations are based on versioned, explicit rules - not AI interpretation. Given the same input, the system always produces the same output.

### AI Explanation Layer (Read-Only)
The AI layer can:
- ✅ Explain rules in plain language
- ✅ Ask clarifying questions when data is incomplete
- ✅ Summarize reasoning for users

The AI layer **cannot**:
- ❌ Modify tax calculations
- ❌ Change filing obligations
- ❌ Override deadlines
- ❌ Make tax decisions

### No Form Selection
Users answer plain questions about their situation. The app internally maps to appropriate BIR forms.

## Phase 1 Supported User Types

- Freelancers
- Self-Employed Professionals
- Micro/Small Businesses (Non-VAT)
- Mixed Income (Employment + Freelance)

**Not included in Phase 1:** VAT workflows, payroll/alphalists, corporate income tax.

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Clone and Install

```bash
git clone <repository-url>
cd ph-tax-app
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your settings (especially JWT_SECRET for production)
```

### 3. Start with Docker

```bash
# Start PostgreSQL and API
docker-compose up -d

# Or for development (includes Prisma Studio)
docker-compose --profile dev up -d
```

### 4. Run Migrations and Seed

```bash
npx prisma migrate dev
npm run prisma:seed
```

### 5. Access the API

- API: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- Prisma Studio: http://localhost:5555 (dev profile only)

## Development

```bash
# Install dependencies
npm install

# Start database only
docker-compose up postgres -d

# Run migrations
npx prisma migrate dev

# Start in development mode
npm run start:dev

# Run tests
npm test

# Run tests with coverage
npm run test:cov
```

## API Overview

### Authentication
```
POST /api/v1/auth/register  - Register new user
POST /api/v1/auth/login     - Login
POST /api/v1/auth/refresh   - Refresh tokens
POST /api/v1/auth/logout    - Logout
```

### Tax Profiles
```
POST   /api/v1/tax-profiles           - Create profile for tax year
GET    /api/v1/tax-profiles           - List all profiles
GET    /api/v1/tax-profiles/:id       - Get profile details
PUT    /api/v1/tax-profiles/:id       - Update profile
DELETE /api/v1/tax-profiles/:id       - Delete profile
```

### Income & Expenses
```
POST   /api/v1/tax-profiles/:id/income     - Add income stream
GET    /api/v1/tax-profiles/:id/income     - List income streams
POST   /api/v1/tax-profiles/:id/expenses   - Add expense
GET    /api/v1/tax-profiles/:id/expenses   - List expenses
```

### Assessment
```
POST /api/v1/tax-profiles/:id/assess     - Run tax assessment
GET  /api/v1/tax-profiles/:id/assessment - Get latest assessment
GET  /api/v1/deadlines                   - Get upcoming deadlines
GET  /api/v1/risk-flags                  - Get all risk flags
```

### AI Explanation (Read-Only)
```
POST /api/v1/ai/explain/rule/:ruleId  - Explain a tax rule
GET  /api/v1/ai/questions/:profileId  - Get clarifying questions
GET  /api/v1/ai/summary/:profileId    - Get reasoning summary
GET  /api/v1/ai/terms/:term           - Explain tax term
```

### Rules Reference
```
GET /api/v1/rules          - List all rule modules
GET /api/v1/rules/:ruleId  - Get rule explanation
```

## Architecture

```
src/
├── auth/              # Authentication (JWT)
├── users/             # User management
├── tax-profile/       # Tax profile per year
├── income/            # Income streams
├── expenses/          # Expense items
├── assessment/        # Assessment orchestration
├── rules-engine/      # Deterministic tax rules
│   ├── rules/         # Individual rule modules
│   └── types/         # Type definitions
├── ai-layer/          # Read-only AI explanations
└── common/            # Shared utilities
```

## Data Models

### TaxProfile
Per-tax-year configuration including:
- User type classification
- BIR registration status
- Selected tax regime (8% flat vs graduated)
- Business details

### IncomeStream
Income sources with:
- Type (freelance, business, employment, etc.)
- Amount and frequency
- Withholding tax details
- Form 2307 tracking

### ExpenseItem
Deductible expenses with:
- Category
- Amount and date
- Receipt documentation
- Deductibility flags

### AssessmentResult
Engine output including:
- Recommended tax regime
- Computed tax values
- Filing obligations
- Deadlines
- Risk flags
- Full reasoning receipt

## Tax Rules Engine

### Rule Modules
- **REGIME_DETERMINATION**: 8% flat vs graduated rates
- **TAX_COMPUTATION**: Actual tax calculation
- **FILING_OBLIGATIONS**: What forms to file
- **DEADLINE_CALCULATION**: When things are due
- **RISK_ASSESSMENT**: Compliance issues

### Key Thresholds [CPA VALIDATION REQUIRED]
```typescript
VAT_THRESHOLD: 3,000,000           // Above this requires VAT registration
PERSONAL_EXEMPTION: 250,000        // First 250K is tax-free (8% regime)
EIGHT_PERCENT_RATE: 0.08           // 8% flat tax rate
OSD_RATE: 0.40                     // Optional Standard Deduction
```

### Graduated Tax Brackets [CPA VALIDATION REQUIRED]
```
₱0 - ₱250,000         : 0%
₱250,001 - ₱400,000   : 15%
₱400,001 - ₱800,000   : 20%
₱800,001 - ₱2,000,000 : 25%
₱2,000,001 - ₱8,000,000: 30%
Above ₱8,000,000      : 35%
```

## Risk Levels

| Level | Meaning |
|-------|---------|
| `NONE` | All good |
| `INFO` | Informational note |
| `WARNING` | User should review |
| `CPA_REVIEW_REQUIRED` | Must consult CPA |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

Test files cover:
- Regime determination logic
- Tax computation accuracy
- Filing obligation mapping
- Risk assessment rules

## Production Deployment

### Environment Variables
```bash
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
DATABASE_URL=<production-postgres-url>
```

### Build and Deploy
```bash
npm run build
npm run start:prod
```

### Docker Production
```bash
docker-compose -f docker-compose.yml up -d
```

## Important Disclaimers

1. **Not Tax Advice**: This system provides guidance only. Always consult a licensed CPA.

2. **CPA Validation Required**: All tax rules marked with `[CPA VALIDATION REQUIRED]` must be validated before production.

3. **No VAT Support**: Phase 1 does not support VAT-registered businesses.

4. **Year-Specific Rules**: Tax rules may change. Update rule modules accordingly.

## Contributing

1. All tax rule changes require CPA review
2. Maintain deterministic behavior in rules engine
3. AI layer must remain read-only for outcomes
4. Include tests for new rules

## License

[Your License Here]

---

Built with ❤️ for Philippine taxpayers
