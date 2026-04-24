import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('APP_PORT', 3001);
  const env = config.get<string>('APP_ENV', 'development');
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const frontendUrlsCsv = config.get<string>('FRONTEND_URLS', '');
  const bodyLimit = config.get<string>('BODY_SIZE_LIMIT', '2mb');
  const isProd = env === 'production' || env === 'staging';

  // Liste d'origines autorisées :
  //  - FRONTEND_URL (compat) est toujours inclus ;
  //  - FRONTEND_URLS (optionnel, CSV) permet d'ajouter d'autres origines
  //    (preview deploy, admin domain, etc.) sans forker la config.
  const allowedOrigins = Array.from(
    new Set(
      [frontendUrl, ...frontendUrlsCsv.split(',')]
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
    ),
  );

  // Derrière un reverse proxy (Nginx/Traefik/k8s), on fait confiance au 1er hop
  // pour que req.ip et les headers X-Forwarded-* soient corrects (rate-limit,
  // audit, cookies secure). Pas d'effet en dev local.
  if (isProd) app.set('trust proxy', 1);

  // Limite de taille des bodies JSON/urlencoded.
  // Protection DoS contre les payloads abusifs ; les uploads binaires (MinIO)
  // passent par Multer avec leur propre limite côté module.
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // Sécurité
  app.use(helmet());
  app.enableCors({
    origin: (origin, cb) => {
      // Autoriser les requêtes sans origin (curl, healthchecks, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin not allowed (${origin})`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Hooks d'arrêt propre : Nest ferme les modules (Prisma $disconnect, etc.)
  // au SIGTERM/SIGINT, évite les connexions orphelines lors des rolling updates.
  app.enableShutdownHooks();

  // Préfixe global API
  app.setGlobalPrefix('api/v1');

  // Validation globale des DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filtre d'erreurs global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteurs globaux : logging d'abord (pour voir les erreurs), puis formatage
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor());

  // Swagger (désactivé en production)
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IOX API')
      .setDescription(
        'API de la plateforme IOX — Structuration, conformité, traçabilité, logistique et mise en marché MCH',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('auth', 'Authentification et gestion des sessions')
      .addTag('users', 'Gestion des utilisateurs')
      .addTag('beneficiaries', 'Gestion des bénéficiaires')
      .addTag('products', 'Produits et fiches techniques')
      .addTag('supply', 'Partenaires et contrats approvisionnement')
      .addTag('batches', 'Lots entrants, transformation, lots finis')
      .addTag('market', 'Décision de mise en marché')
      .addTag('audit', "Journal d'audit")
      .addTag('health', 'Santé du service')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Bind explicite sur 0.0.0.0 pour être joignable depuis l'hôte Docker/k8s.
  await app.listen(port, '0.0.0.0');
  console.log(
    `🚀 IOX Backend démarré — env=${env} port=${port} origins=[${allowedOrigins.join(', ')}] bodyLimit=${bodyLimit}`,
  );
  if (env !== 'production') {
    console.log(`📚 Swagger : http://localhost:${port}/api/docs`);
  }
}

bootstrap();
