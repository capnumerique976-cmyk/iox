# Checklist de Lancement BETA PRIVEE

> IOX Marketplace -- Liste de verification avant le lancement de la beta privee.

## Pre-conditions techniques

- [ ] **DNS** -- Enregistrements A/CNAME pour `iox.mycloud.yt` et `api.iox.mycloud.yt` resolus
- [ ] **SSL** -- Certificats Let's Encrypt valides et auto-renouveles (certbot timer actif)
- [ ] **Base de donnees** -- Migrations Prisma appliquees (`npx prisma migrate deploy`)
- [ ] **Seed demo** -- Fixtures beta executees (`IOX_DEMO_SEED=1 pnpm seed-demo`)
- [ ] **Stripe Connect** -- Compte plateforme actif, cle API prod configuree
- [ ] **Stripe webhook** -- Endpoint `/stripe/webhook` configure et verifie (events: `checkout.session.completed`, `account.updated`)
- [ ] **Resend** -- Cle API prod configuree, domaine verifie, `NOTIF_EMAIL_FROM` defini
- [ ] **MinIO/S3** -- Bucket `iox-marketplace` cree, politique publique sur `public/`
- [ ] **Variables d'environnement** -- `.env.production` complet (cf. `docs/ops/SECRETS.md`)
- [ ] **Health check** -- `GET /health` retourne 200 avec DB + Redis OK

## Objectifs beta

| Metrique | Cible |
|----------|-------|
| Nombre de sellers onboardes | 20 |
| Produits publies | 40+ |
| Offres actives | 40+ |
| RFQ recues (J+30) | 10+ |

## Plan de communication

### J-7 (preparation)

- [ ] Liste des 20 sellers cibles validee avec l'equipe terrain
- [ ] Agents MCH briefes sur le processus d'onboarding (cf. `BETA_PRIVEE_ONBOARDING_AGENT_MCH.md`)
- [ ] Script `generate-seller-invite.sh` teste en preprod
- [ ] Templates email (FR + EN) valides visuellement (envoi test via transport mock)
- [ ] Messages SMS/WhatsApp pre-remplis pour chaque seller

### J0 (lancement)

- [ ] Deploiement final en production
- [ ] Smoke test complet (auth, catalog, RFQ, payment flow)
- [ ] Seed demo verifie (9 sellers, 13 produits, 13 offres visibles)
- [ ] Premiers 5 sellers invites par l'equipe terrain
- [ ] Monitoring Sentry/logs actif (alerte Slack si erreur 5xx)

### J+3 (suivi rapproche)

- [ ] Relance sellers non connectes (SMS/WhatsApp J+3)
- [ ] Verification profils completes (photos, descriptions, offres)
- [ ] 5 sellers supplementaires invites
- [ ] Review logs email (envois OK, pas de bounce)
- [ ] Review metriques : pages vues catalog, inscriptions buyer

### J+7 (consolidation)

- [ ] Relance J+7 pour sellers a profil incomplet
- [ ] 10 sellers restants invites
- [ ] Premier RFQ de test (buyer smoke ou buyer reel)
- [ ] Verification flow complet : RFQ -> devis -> paiement -> confirmation
- [ ] Rapport interim equipe (sellers actifs, produits, blocages)

### J+14 (stabilisation)

- [ ] Bilan intermediaire : sellers actifs vs cible
- [ ] Correction bugs remontes par les sellers
- [ ] Ajustements UX si necessaire
- [ ] Preparation communication buyers (newsletter, LinkedIn)

### J+30 (bilan beta)

- [ ] Bilan complet : KPIs vs objectifs
- [ ] Decision go/no-go pour ouverture publique
- [ ] Plan d'action pour les sellers inactifs
- [ ] Roadmap corrections pour la V1 publique

## Schedule de smoke tests

| Jour | Scope | Responsable |
|------|-------|-------------|
| J0 | Auth + Catalog + RFQ + Paiement | Equipe dev |
| J+1 | Onboarding seller (real device) | Agent MCH |
| J+3 | Email delivery (Resend logs) | Equipe dev |
| J+7 | RFQ end-to-end (buyer -> seller) | Equipe dev + agent |
| J+14 | Performance (temps de reponse pages) | Equipe dev |

## Plan de rollback

### Rollback applicatif

```bash
# Revenir au tag precedent
git checkout v0.X.Y-1
pnpm install && pnpm build
pm2 restart iox-backend
pm2 restart iox-frontend
```

### Rollback base de donnees

```bash
# Identifier la derniere migration
npx prisma migrate status

# Rollback manuel si necessaire (cf. docs/ops/ROLLBACK.md)
# ATTENTION : les donnees creees par les sellers seront perdues
```

### Rollback DNS

Si probleme SSL ou infrastructure :

```bash
# Pointer temporairement vers la page de maintenance
# Mettre a jour l'enregistrement A vers le serveur de maintenance
```

### Criteres de declenchement du rollback

- Erreur 5xx persistante > 15 min sur l'API
- Perte de donnees detectee (sellers, produits, RFQ)
- Faille de securite critique (injection, auth bypass)
- Stripe webhook en erreur > 1h (paiements bloques)

### Communication en cas de rollback

- Notifier les agents MCH via groupe WhatsApp
- Email aux sellers deja onboardes
- Message sur le canal Slack interne
