# IOX — Roadmap Produit

**Date :** 2026-05-10  
**Statut produit actuel :** MVP fonctionnel validé (M63 GO)

> **Convention :** Les éléments marqués [CONSTRUIT] sont livrés et testés. Les éléments [ROADMAP] sont des propositions — non commitées, non financées, sujettes à arbitrage.

---

## État actuel — Ce qui est construit [CONSTRUIT]

### Plateforme backend (NestJS — 186 endpoints, 1 003 tests)

| Module | Statut | Description |
|---|---|---|
| Auth (JWT access/refresh) | ✅ CONSTRUIT | Login, refresh token, logout, me |
| Gestion utilisateurs et rôles | ✅ CONSTRUIT | MARKETPLACE_SELLER / BUYER / ADMIN |
| Profils vendeurs (SellerProfile) | ✅ CONSTRUIT | Onboarding, approbation admin, workflow complet |
| Catalogue produits (MarketplaceProduct) | ✅ CONSTRUIT | Création, publication, modération |
| Offres (MarketplaceOffer) | ✅ CONSTRUIT | Prix, incoterms, lead time, visibilité |
| Recherche produits (MeiliSearch) | ✅ CONSTRUIT | Full-text, filtres catégorie/certification |
| RFQ (QuoteRequest) | ✅ CONSTRUIT | FSM NEW → QUOTED → WON / LOST |
| Messagerie RFQ | ✅ CONSTRUIT | Fil de discussion par RFQ, audit trail |
| Paiements (Stripe Connect) | ✅ CONSTRUIT | Commission 5%, versement automatique vendeur |
| Facturation (Invoice) | ✅ CONSTRUIT | Génération PDF, archivage, liste paginée |
| Conformité documentaire | ✅ CONSTRUIT | Upload, vérification admin, VERIFIED/PENDING/REJECTED |
| Dashboard alertes | ✅ CONSTRUIT | RFQs stales, métriques marketplace |
| Review queue admin | ✅ CONSTRUIT | Modération produits et vendeurs |
| MediaAssets | ✅ CONSTRUIT | Upload multipart, approbation, URL signée |
| Seed démo idempotent | ✅ CONSTRUIT | 9 sellers, 13 produits, RFQ WON + paiement + facture |
| Swagger API docs | ✅ CONSTRUIT | 186 chemins, 26 tags |

### Plateforme frontend (Next.js)

| Page / Composant | Statut |
|---|---|
| Catalogue public | ✅ CONSTRUIT |
| Fiche produit | ✅ CONSTRUIT |
| Authentification | ✅ CONSTRUIT |
| Dashboard buyer (RFQs, factures) | ✅ CONSTRUIT |
| Dashboard seller (RFQs, conformité, factures) | ✅ CONSTRUIT |
| Dashboard admin | ✅ CONSTRUIT |

---

## Roadmap court terme — 0-3 mois [ROADMAP]

### P0 — Lancement commercial
- [ ] Onboarding premiers vendeurs réels (3-5 coopératives pilotes)
- [ ] Configuration Stripe Connect live (clés prod, KYC vendeurs)
- [ ] Déploiement infrastructure production (VPS / Railway)
- [ ] Domaine, SSL, emails transactionnels (SendGrid / Mailgun)
- [ ] RGPD : CGU, politique de confidentialité, mentions légales

### P1 — Qualité produit
- [ ] App mobile acheteur (React Native ou Next.js PWA)
- [ ] Notifications email temps réel (nouveau message, RFQ mise à jour)
- [ ] `@ApiResponse` complet sur 30 controllers secondaires
- [ ] Internationalisation frontend (fr/en)
- [ ] Tests e2e (Playwright)

### P2 — Croissance vendeurs
- [ ] Interface d'onboarding self-service (sans intervention admin)
- [ ] Import catalogue CSV/Excel
- [ ] Intégration certificat bio AB automatisée (lien AB Agri)

---

## Roadmap moyen terme — 3-12 mois [ROADMAP]

### Fonctionnalités acheteurs
- [ ] Panier multi-vendeurs (commande groupée)
- [ ] Abonnements (commandes récurrentes)
- [ ] Comparateur produits / vendeurs
- [ ] Favoris et listes d'achat

### Fonctionnalités vendeurs
- [ ] Tableau de bord analytique (CA, conversion RFQ, clients récurrents)
- [ ] Gestion des stocks et disponibilités
- [ ] Calendrier de récolte / saisons
- [ ] Devis PDF téléchargeable avant paiement

### Infrastructure & Scale
- [ ] API v2 (versioning mobile)
- [ ] Webhook temps réel (WebSockets)
- [ ] CDN pour MediaAssets
- [ ] Multi-région (extension Réunion, Martinique, Guadeloupe)

---

## Roadmap long terme — 12-36 mois [ROADMAP]

- Extension géographique : Réunion → Antilles → Afrique subsaharienne
- White-label API pour institutionnels (chambres d'agriculture, collectivités)
- Score de confiance vendeur (rating, avis acheteurs)
- Financement export intégré (affacturage, avance sur facture)
- Traçabilité blockchain pour certifications premium

---

## Décisions d'architecture (ADRs clés)

| Décision | Choix | Raison |
|---|---|---|
| ORM | Prisma | Typesafety, migrations versionnées |
| Auth | JWT stateless | Scalabilité, pas de session server-side |
| Paiements | Stripe Connect | Seul provider avec split payment marchand fiable en EU |
| Recherche | MeiliSearch | Open source, self-hostable, temps réel |
| Stockage | MinIO / S3-compatible | Portabilité cloud |
| Framework backend | NestJS | Modules, DI, testabilité |
| Framework frontend | Next.js | SEO, SSR, ecosystem React |

---

*Voir aussi : `business-model-iox.md`, `faq-investisseurs-iox.md`*
