import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Using Fastify for better performance
  // NestJS provides excellent TypeScript support, DI, and modular architecture
  // Fastify is ~2x faster than Express and has better schema validation
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Global prefix for API versioning
  app.setGlobalPrefix('api/v1');

  // Global validation pipe with class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Philippine Tax Guidance API')
    .setDescription(
      `
      A beginner-first tax guidance API for Philippine taxpayers.

      ## Key Concepts
      - **Deterministic Rules Engine**: Tax calculations are based on versioned, CPA-validated rules
      - **AI Explanation Layer**: AI can only explain rules and ask clarifying questions - it cannot change outcomes
      - **No Form Selection**: Users answer plain questions; the system maps to appropriate BIR forms internally

      ## Phase 1 Supported User Types
      - Freelancers
      - Self-Employed Professionals
      - Micro/Small Businesses (Non-VAT)
      - Mixed Income (Employment + Freelance)

      ## Important Notes
      - All tax rules require CPA validation before production use
      - This API provides guidance only - consult a licensed CPA for official tax advice
      `,
    )
    .setVersion('1.0.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('tax-profiles', 'Tax profile management per tax year')
    .addTag('income', 'Income stream management')
    .addTag('expenses', 'Expense item management')
    .addTag('assessment', 'Tax assessment and obligations')
    .addTag('rules', 'Tax rules reference (read-only)')
    .addTag('ai-explain', 'AI explanation layer')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
