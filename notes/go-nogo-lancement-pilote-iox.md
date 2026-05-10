# IOX — Décision Go/No-Go lancement pilote

**Date :** 2026-05-11  
**Version :** Post-merge PR #133 (commit `0874740`)  
**Scope :** Pilote terrain 3-5 coopératives Mayotte

---

## 1. Résumé exécutif

| Dimension | Statut | Bloquant ? |
|---|---|---|
| Code & tests | ✅ 1003/1003 backend, 508/508 frontend, TSC clean | Non |
| Merge main | ✅ PR #133 mergée | Non |
| Sécurité | ⚠️ 3 points à corriger | Oui (2/3 critiques) |
| RGPD / Légal | ⚠️ Templates créés, non finalisés | Oui (avant ouverture publique) |
| Stripe live | ⚠️ Intégration prête, clés test uniquement | Oui (avant première transaction) |
| Backup / Restore | ⚠️ Scripts créés, cron non configuré | Oui (avant premier déploiement) |
| Monitoring | ⚠️ Architecture documentée, non déployée | Moyen |
| PWA / Mobile | ❌ Pas de manifest.json ni Service Worker | Non (pilote peut démarrer sans) |
| Guides utilisateurs | ✅ Créés (vendeur, acheteur, admin) | Non |
| Infra production | ⚠️ VPS non provisionné | Oui |

---

## 2. Critères Go/No-Go par dimension

### 2.1 Code — ✅ GO

- Backend : 87 suites, 1003 tests, 0 failure
- Frontend : 78 fichiers, 508 tests, 0 failure
- TypeScript strict : 0 erreur
- Fonctionnalités M57-M65 mergées dans main :
  - ComplianceModule (seller/admin)
  - RFQ messages chat (M58)
  - Multi-devise EUR/USD (M59)
  - Swagger @ApiResponse (M60)
  - Seed-demo WON+payment+invoice+compliance (M61-M63)

**Décision : GO** — code production-ready.

---

### 2.2 Sécurité — ⚠️ GO AVEC CORRECTIONS REQUISES

Audit M67 : 7✅ / 3⚠️ / 0❌

**Points bloquants à corriger avant prod :**

| # | Point | Action | Effort |
|---|---|---|---|
| S1 | `STRIPE_SECRET_KEY` optionnel en prod (pas de boot check) | Ajouter guard dans `env.validation.ts` si `APP_ENV=production` | 30 min |
| S2 | `serverActions.allowedOrigins` hardcodé `localhost:3000` | Changer en `process.env.FRONTEND_URL` dans `next.config.mjs` | 15 min |
| S3 | `X-Frame-Options` conflictuels (DENY vs SAMEORIGIN) | Harmoniser middleware.ts sur DENY | 10 min |

**Ce qui est bon :**
- JwtAuthGuard + RolesGuard globaux, `@Public()` opt-in
- Throttle global (100 req/60s) + throttles spécifiques login/RFQ/uploads
- CORS strict (liste blanche explicite)
- Webhook Stripe signé HMAC + `rawBody` préservé
- Upload MIME whitelist server-side (jpeg/png/webp, mp4/webm/quicktime)
- Bull Board protégé JWT + rôle ADMIN
- Swagger désactivé en production

**Décision : NO-GO** jusqu'à correction S1 + S2 (S3 recommandé). Effort total : ~1h.

---

### 2.3 RGPD / Légal — ⚠️ NO-GO avant ouverture publique

Templates créés dans `notes/legal/` :
- `rgpd-checklist.md` ✅
- `mentions-legales-template.md` ✅
- `cgu-template.md` ✅
- `politique-confidentialite-template.md` ✅

**Actions requises :**
- [ ] Remplir les `[À compléter]` (entité légale, SIREN, adresse, DPO)
- [ ] Faire relire par un juriste (CGU, politique confidentialité)
- [ ] Intégrer dans le frontend (pages `/mentions-legales`, `/cgu`, `/confidentialite`)
- [ ] Banner cookie si analytics (non critique pour pilote B2B)

**Pour pilote interne (3-5 coops invitées, non public) :** tolérable sans pages légales finalisées si participants sont informés oralement.

**Décision : NO-GO avant ouverture publique** / GO conditionnel pour pilote fermé.

---

### 2.4 Stripe Live — ⚠️ NO-GO pour transactions réelles

Intégration technique complète (Connect Express, payment intents, 5% fee, webhooks).

**Manque :**
- [ ] Compte Stripe Dashboard en mode live (KYB entreprise)
- [ ] Clés live (`sk_live_`, `whsec_`) dans `.env` production
- [ ] Webhook endpoint enregistré pour domaine prod
- [ ] KYC individuel de chaque vendeur coopérative (~30 min/vendeur)
- [ ] Handler `charge.dispute.*` à implémenter [NON BLOQUANT pilote]

**Pour pilote :** peut fonctionner en mode test (`sk_test_`) si acheteur/vendeur pilote = équipe interne.

**Décision : NO-GO pour vraies transactions** / GO pour démo en mode test.

---

### 2.5 Backup / Restore — ⚠️ NO-GO avant premier déploiement prod

Scripts créés :
- `scripts/backup-postgres.sh` ✅ (set -euo pipefail, pg_dump, intégrité, rétention 7j)
- `scripts/restore-postgres.sh` ✅ (confirmation interactive, post-restore verification)

**Actions requises :**
- [ ] Configurer cron sur VPS : `0 2 * * * /opt/iox/scripts/backup-postgres.sh`
- [ ] Configurer `mc mirror` pour MinIO bucket
- [ ] Tester restore sur DB de staging avant premier déploiement prod
- [ ] Vérifier que BACKUP_DIR a espace disque suffisant

**Décision : NO-GO** pour déploiement prod sans backup opérationnel.

---

### 2.6 Monitoring — ⚠️ Recommandé avant prod

Stack recommandée documentée (M71) :
- UptimeRobot : 5 moniteurs (health, frontend, API)
- Grafana Cloud free : métriques Prometheus via `/api/v1/metrics`
- Sentry free : error tracking frontend + backend
- PM2 : process management + logs

**Effort estimé pour monitoring minimal :** 4h (UptimeRobot + Sentry).

**Décision : RECOMMANDÉ** avant prod. Pilote peut démarrer sans si équipe surveille manuellement.

---

### 2.7 PWA / Mobile — ❌ Non bloquant pilote

État actuel : aucun manifest.json, aucun Service Worker.
Score Lighthouse PWA estimé : 0-30/100.

**Impact :** L'app fonctionne en mode web mobile (responsive Tailwind). Pas d'installation sur écran d'accueil. Acceptable pour pilote B2B sur desktop.

**Effort PWA basique :** 6-8h (manifest + next-pwa + icônes).

**Décision : GO** pour pilote — priorité post-pilote si besoin mobile fort.

---

### 2.8 Infra production — ⚠️ Prérequis physique

Checklist infra complète dans `notes/deployment-checklist-production-iox.md`.

Minimum requis :
- VPS Ubuntu 22.04 LTS (2 vCPU / 4 GB RAM min)
- PostgreSQL v15+, Redis v7+, MinIO
- Domaine + SSL (Let's Encrypt / Caddy)
- PM2 ou Docker Compose

**Décision : NO-GO** sans infra provisionnée.

---

## 3. Décision finale

### GO / NO-GO synthèse

| | |
|---|---|
| **GO code** | ✅ — Tests verts, TypeScript clean, fonctionnalités M55B-M65 mergées |
| **GO démo investisseur** | ✅ — Seed démo, deck PDF, script RDV, checklist prêts |
| **GO pilote fermé** | ⚠️ **CONDITIONNEL** — après S1+S2 sécurité + infra VPS + backup |
| **GO production publique** | ❌ **NO-GO** — RGPD non finalisé, Stripe live non activé, monitoring absent |

### Actions prioritaires (ordre strict)

| Priorité | Action | Effort | Qui |
|---|---|---|---|
| P0 | Corriger S1 (Stripe boot check) + S2 (allowedOrigins) + S3 | 1h dev | Dev |
| P0 | Provisionner VPS prod (Ubuntu 22.04, 4GB RAM) | 2h ops | Ops |
| P0 | Configurer backup cron + tester restore | 2h ops | Ops |
| P1 | Remplir + valider légalement CGU + mentions légales | 4h legal | Fondateur + juriste |
| P1 | Activer Stripe live (KYB compte + clés live) | 2h | Fondateur |
| P1 | KYC vendeurs pilotes Stripe Connect | 30min/vendeur | Vendeur |
| P2 | UptimeRobot + Sentry setup (monitoring minimal) | 4h | Ops |
| P3 | PWA basique (manifest + next-pwa) | 8h | Dev |
| P3 | Intégrer pages légales frontend | 4h dev | Dev |

### Timeline recommandée

```
Semaine 1 : P0 — Fix sécurité + VPS + backup
Semaine 2 : P1 — Légal + Stripe live + onboarding vendeurs pilotes
Semaine 3 : Premier accès vendeurs pilotes (mode test Stripe)
Semaine 4 : Première transaction réelle (Stripe live)
```

---

## 4. Fichiers créés dans M66-M75

| Mandat | Fichier | Type |
|---|---|---|
| M66 | Merge PR #133 (commit `0874740`) | Git |
| M67 | `notes/security-prelaunch-audit-iox.md` | Audit sécurité |
| M68 | `notes/legal/rgpd-checklist.md` | RGPD |
| M68 | `notes/legal/mentions-legales-template.md` | Légal template |
| M68 | `notes/legal/cgu-template.md` | Légal template |
| M68 | `notes/legal/politique-confidentialite-template.md` | Légal template |
| M69 | `notes/stripe-live-readiness-iox.md` | Ops Stripe |
| M70 | `notes/backup-restore-runbook-iox.md` | Ops backup |
| M70 | `scripts/backup-postgres.sh` | Script |
| M70 | `scripts/restore-postgres.sh` | Script |
| M71 | `notes/monitoring-alerting-iox.md` | Ops monitoring |
| M72 | `notes/plan-pilote-terrain-iox.md` | Pilote |
| M73 | `notes/mobile-pwa-readiness-iox.md` | Tech audit |
| M74 | `notes/guide-vendeur-iox.md` | Guide utilisateur |
| M74 | `notes/guide-acheteur-iox.md` | Guide utilisateur |
| M74 | `notes/guide-admin-iox.md` | Guide utilisateur |
| M75 | `notes/go-nogo-lancement-pilote-iox.md` | Ce fichier |
| M66-M75 | `notes/handoff-mandat-66-75-prelaunch.md` | Handoff global |

---

## 5. Prochain mandat recommandé

**Mandat 76** :
- **Option A** : Fix sécurité P0 (S1+S2+S3) + déploiement VPS production
- **Option B** : PWA basique (manifest + next-pwa + icônes) — 1 journée dev
- **Option C** : Intégration pages légales frontend (CGU, mentions légales, politique confidentialité)
- **Option D** : Onboarding réel d'une première coopérative pilote
