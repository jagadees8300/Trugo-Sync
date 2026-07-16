import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config } from 'dotenv';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '.env') });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trugo Sync API')
    .setDescription(
      'Protected routes show a padlock. Click **Authorize** (top right), paste your JWT from POST /auth/login, then call the API.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste access_token from POST /auth/login (without "Bearer ")',
      },
      'JWT-auth',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  app.enableCors();

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();
