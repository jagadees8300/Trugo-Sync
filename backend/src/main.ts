import './crypto-polyfill';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

config({ path: resolve(process.cwd(), '.env') });

const API_ROUTE_PREFIXES = [
  '/auth',
  '/users',
  '/projects',
  '/tasks',
  '/dashboard',
  '/notifications',
  '/leaves',
  '/attendance',
  '/reports',
  '/roles',
  '/uploads',
  '/api',
  '/socket.io',
];

function resolveFrontendDist(): string | null {
  const candidates = [
    process.env.FRONTEND_DIST,
    join(process.cwd(), 'public'),
    join(process.cwd(), '..', 'frontend', 'dist'),
    // When running compiled dist/main.js from backend/
    join(__dirname, '..', 'public'),
    join(__dirname, '..', '..', 'frontend', 'dist'),
  ].filter((p): p is string => Boolean(p));

  for (const dir of candidates) {
    if (existsSync(join(dir, 'index.html'))) return dir;
  }
  return null;
}

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

  const frontendDist = resolveFrontendDist();
  if (frontendDist) {
    app.useStaticAssets(frontendDist);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const path = req.path;
      if (/\.[a-zA-Z0-9]+$/.test(path)) return next();

      const isApiPath = API_ROUTE_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      // Browser page loads (e.g. /dashboard) share prefixes with API routes.
      // Serve the SPA for HTML/document requests; keep JSON/API calls on Nest.
      const isPageRequest =
        req.get('sec-fetch-dest') === 'document' ||
        req.accepts(['html', 'json']) === 'html';
      if (isApiPath && !isPageRequest) return next();

      res.sendFile(join(frontendDist, 'index.html'));
    });
    console.log(`Serving frontend build from ${frontendDist}`);
  } else {
    console.warn(
      'Frontend build not found. Run "npm run build" in frontend/ (or set FRONTEND_DIST).',
    );
  }

  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
}
bootstrap();
