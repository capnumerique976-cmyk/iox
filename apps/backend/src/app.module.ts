import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnv } from './common/config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MembershipsModule } from './memberships/memberships.module';
import { AuditModule } from './audit/audit.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { ProductsModule } from './products/products.module';
import { CompaniesModule } from './companies/companies.module';
import { SupplyContractsModule } from './supply-contracts/supply-contracts.module';
import { InboundBatchesModule } from './inbound-batches/inbound-batches.module';
import { TransformationOperationsModule } from './transformation-operations/transformation-operations.module';
import { ProductBatchesModule } from './product-batches/product-batches.module';
import { LabelValidationsModule } from './label-validations/label-validations.module';
import { DocumentsModule } from './documents/documents.module';
import { MarketReleaseDecisionsModule } from './market-release-decisions/market-release-decisions.module';
import { TraceabilityModule } from './traceability/traceability.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExportsModule } from './exports/exports.module';
import { IncidentsModule } from './incidents/incidents.module';
import { DistributionsModule } from './distributions/distributions.module';
import { SellerProfilesModule } from './seller-profiles/seller-profiles.module';
import { MediaAssetsModule } from './media-assets/media-assets.module';
import { MarketplaceProductsModule } from './marketplace-products/marketplace-products.module';
import { MarketplaceOffersModule } from './marketplace-offers/marketplace-offers.module';
import { MarketplaceCatalogModule } from './marketplace-catalog/marketplace-catalog.module';
import { QuoteRequestsModule } from './quote-requests/quote-requests.module';
import { MarketplaceReviewModule } from './marketplace-review/marketplace-review.module';
import { MarketplaceDocumentsModule } from './marketplace-documents/marketplace-documents.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateEnv,
    }),

    // Rate limiting global : 100 req / 60s par IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    DatabaseModule,
    CommonModule,
    HealthModule,
    MetricsModule,

    // Module 1 — Auth / Rôles / Audit
    AuditModule,
    UsersModule,
    MembershipsModule,
    AuthModule,

    // Module 2 — Bénéficiaires
    BeneficiariesModule,

    // Module 3 — Produits et fiches techniques
    ProductsModule,

    // Module 4 — Partenaires amont & Contrats d'approvisionnement
    CompaniesModule,
    SupplyContractsModule,

    // Module 5 — Réception matière & Lots entrants
    InboundBatchesModule,

    // Module 6 — Transformation & Conditionnement & Lots finis
    TransformationOperationsModule,
    ProductBatchesModule,

    // Module 7 — Étiquetage & Gestion documentaire
    LabelValidationsModule,
    DocumentsModule,

    // Module 8 — Décision de mise en marché (7 conditions)
    MarketReleaseDecisionsModule,

    // Module 9 — Traçabilité transversale
    TraceabilityModule,

    // Module 10 — Dashboard & Exports
    DashboardModule,
    ExportsModule,

    // Module 11 — Incidents & Non-conformités
    IncidentsModule,

    // Module 16 — Distributions
    DistributionsModule,

    // Module Marketplace — Profils vendeurs
    SellerProfilesModule,
    // Module Marketplace — Médias (images, illustrations)
    MediaAssetsModule,
    // Module Marketplace — Produits
    MarketplaceProductsModule,
    // Module Marketplace — Offres
    MarketplaceOffersModule,
    // Module Marketplace — Catalogue public (consultation)
    MarketplaceCatalogModule,
    // Module Marketplace — Demandes de devis (RFQ)
    QuoteRequestsModule,
    // Module Marketplace — File de modération staff
    MarketplaceReviewModule,
    // Module Marketplace — Documents (certifs, COA, FDS, FT) avec vérification
    MarketplaceDocumentsModule,
  ],
  providers: [
    // Rate limiting (doit être AVANT JwtAuthGuard pour protéger /auth/login)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Guards appliqués globalement — @Public() pour les routes ouvertes
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
