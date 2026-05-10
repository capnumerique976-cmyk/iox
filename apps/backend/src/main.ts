import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PaginationHeaderInterceptor } from './common/interceptors/pagination-header.interceptor';
import { ETagInterceptor } from './common/interceptors/etag.interceptor';

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
  // PAY-1 phase 1 — Stripe webhook nécessite le body raw pour vérif signature.
  // On le préserve sur req.rawBody uniquement pour /payments/webhook.
  app.use(
    json({
      limit: bodyLimit,
      verify: (req, _res, buf) => {
        const url = (req as { url?: string }).url ?? '';
        if (url.includes('/payments/webhook')) {
          (req as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
        }
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // Sécurité — Helmet avec CSP renforcée
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", ...allowedOrigins],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false, // disable CSP in dev for hot-reload
      crossOriginEmbedderPolicy: isProd,
      crossOriginOpenerPolicy: isProd ? { policy: 'same-origin' } : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );
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

  // Préfixe global API — /admin/* exclus pour Bull Board (pas api/v1 devant).
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'admin/(.*)', method: RequestMethod.ALL }],
  });

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
  // ETag doit être en dernier (innermost) pour voir le body final.
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
    new PaginationHeaderInterceptor(),
    new ETagInterceptor(),
  );

  // Swagger (désactivé en production)
  if (env !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('IOX API')
      .setDescription(
        'API de la plateforme IOX — Structuration, conformité, traçabilité, logistique et mise en marché MCH',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      // ── Authentification & utilisateurs ─────────────────────────────────
      .addTag('auth', 'Authentification et gestion des sessions')
      .addTag('users', 'Gestion des utilisateurs')
      // ── Marketplace — catalogue & offres ────────────────────────────────
      .addTag('marketplace - catalog (public)', 'Catalogue public (sans auth) — offres, produits, vendeurs')
      .addTag('marketplace - products', 'Produits marketplace (seller) — CRUD, publication, modération')
      .addTag('marketplace - offers', "Offres marketplace (prix, devise, disponibilité) — nécessite rôle MARKETPLACE_SELLER")
      .addTag('marketplace - seller profiles', 'Profils vendeur — création, KYC, statuts, ownership')
      .addTag('marketplace - quote requests', "Demandes de devis (RFQ) — FSM: NEW→QUOTED→WON/LOST. Scoping automatique par rôle buyer/seller/admin.")
      .addTag('marketplace - documents', 'Documents de conformité marketplace (upload, validation admin)')
      .addTag('marketplace - certifications', 'Certifications produits/profils marketplace')
      .addTag('marketplace - media assets', 'Images et médias marketplace')
      .addTag('marketplace - review queue', "File de modération admin — approve/reject profils et offres")
      .addTag('admin marketplace categories', 'Catégories marketplace (admin)')
      // ── Paiements & facturation ──────────────────────────────────────────
      .addTag('payments', "Paiements Stripe Connect — checkout session (buyer), onboarding (seller), remboursement, webhook Stripe. Devises supportées : EUR, USD.")
      .addTag('invoices', 'Factures — liste, détail, téléchargement PDF (application/pdf)')
      // ── Conformité & dashboard ───────────────────────────────────────────
      .addTag('compliance', "Conformité vendeur — résumé KYC, documents manquants/refusés, alertes. Rôles : MARKETPLACE_SELLER (propre profil) ou ADMIN/QUALITY_MANAGER (global).")
      .addTag('dashboard', "Tableaux de bord — stats internes (staff), alertes marketplace (seller/buyer), activité récente")
      // ── Documents & labels ───────────────────────────────────────────────
      .addTag('documents', 'Documents de conformité (upload multipart, validation statut, URL download)')
      .addTag('label-validations', "Validations de labels/certifications — création, mise à jour, requêtes")
      // ── Modules opérationnels MCH ────────────────────────────────────────
      .addTag('beneficiaries', 'Gestion des bénéficiaires')
      .addTag('products', 'Produits et fiches techniques')
      .addTag('supply', 'Partenaires et contrats approvisionnement')
      .addTag('batches', 'Lots entrants, transformation, lots finis')
      .addTag('market', 'Décision de mise en marché')
      .addTag('audit', "Journal d'audit")
      // ── Support ──────────────────────────────────────────────────────────
      .addTag('search', 'Recherche full-text (MeiliSearch + fallback Postgres)')
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
