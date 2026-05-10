# Handoff — Mandat 76 : Fix sécurité P0 + préparation VPS pilote fermé

**Date :** 2026-05-11  
**Branche :** `main` (commit post-M76)  
**Statut :** ✅ TERMINÉ

---

## 1. Contexte

Post M66-M75 : PR #133 mergée (commit `0874740`), 3 points sécurité P0 identifiés en M67, décision GO conditionnel pilote fermé.

---

## 2. Corrections sécurité P0

### S1 — Stripe boot check ✅

**Fichier modifié :** `apps/backend/src/common/config/env.validation.ts`

**Avant :** `STRIPE_SECRET_KEY` entièrement optionnel, aucun signal au boot.

**Après :** Ajout `warnMissingOptional(env, raw)` appelée après `assertNoPlaceholder()` :
- En `staging` et `production` : `console.warn` si `STRIPE_SECRET_KEY` absent
- En `production` uniquement : `console.warn` si clé commence par `sk_test_` (test en prod)
- `console.warn` si `STRIPE_WEBHOOK_SECRET` absent en staging/prod
- `console.warn` si `APP_URL` absent en production
- Aucune valeur de secret loggée
- Aucun boot bloqué (warnings non bloquants — dégradation gracieuse)

**Tests ajoutés :** `apps/backend/src/common/config/env.validation.spec.ts` — 13 tests :
- validation dev basique (3 cas)
- assertNoPlaceholder prod (3 cas)
- warnMissingOptional staging/prod (7 cas)

### S2 — allowedOrigins localhost ✅

**Fichier modifié :** `apps/frontend/next.config.mjs`

**Avant :**
```js
allowedOrigins: ['localhost:3000'],
```

**Après :**
```js
allowedOrigins: process.env.FRONTEND_URL
  ? [new URL(process.env.FRONTEND_URL).host]
  : ['localhost:3000'],
```

En production avec `FRONTEND_URL=https://pilot.iox.example` → `allowedOrigins: ['pilot.iox.example']`. Localhost non autorisé en production. En développement (pas de `FRONTEND_URL`) → fallback `localhost:3000` inchangé.

### S3 — X-Frame-Options conflit ✅

**Fichier modifié :** `apps/frontend/src/middleware.ts`

**Avant :** middleware.ts définissait `X-Frame-Options: SAMEORIGIN` pour les routes non-API, en conflit avec `X-Frame-Options: DENY` dans `next.config.mjs headers()`.

**Après :** Supprimé du middleware. Source unique : `next.config.mjs` → `DENY` pour toutes les routes. Décision documentée dans le commentaire middleware.

---

## 3. Tests exécutés

| Suite | Avant M76 | Après M76 |
|---|---|---|
| Backend Jest | ✅ 88 suites, 1003 tests, 0 failure | ✅ **88 suites, 1016 tests**, 0 failure |
| Frontend Vitest | ✅ 78 files, 508 tests, 0 failure | ✅ 78 files, 508 tests, 0 failure |
| TypeScript backend | ✅ 0 erreur | ✅ 0 erreur |

**+13 nouveaux tests** : `env.validation.spec.ts` (S1 Stripe boot check).

---

## 4. Fichiers modifiés / créés

| Fichier | Action | Raison |
|---|---|---|
| `apps/backend/src/common/config/env.validation.ts` | Modifié | S1 — ajout `warnMissingOptional()` |
| `apps/backend/src/common/config/env.validation.spec.ts` | Créé | S1 — 13 tests couverture |
| `apps/frontend/next.config.mjs` | Modifié | S2 — `allowedOrigins` dynamique |
| `apps/frontend/src/middleware.ts` | Modifié | S3 — suppression `X-Frame-Options` conflictuel |
| `notes/deployment-checklist-vps-pilote-ferme-iox.md` | Créé | Partie C — checklist VPS pilote |
| `notes/handoff-mandat-76-security-vps-pilot.md` | Créé | Ce fichier |

---

## 5. Vérification scripts backup

`scripts/backup-postgres.sh` ✅
- `set -euo pipefail` — sortie immédiate sur erreur
- Atomic write : fichier `.tmp` → rename final
- Vérification intégrité `gunzip -t` post-backup
- Rétention configurable (défaut 7 jours)
- Logging horodaté complet

`scripts/restore-postgres.sh` ✅
- Confirmation interactive `OUI` requise (ou `FORCE=1` pour CI)
- Vérification intégrité `gunzip -t` avant restore
- Fermeture connexions actives avant DROP
- Vérification post-restore (comptage tables/users/payments)
- Warning final : redémarrer PM2

**Note technique :** `pg_dump --format=custom | gzip` crée une double-compression. `gunzip | pg_restore` décompresse correctement. Fonctionnel mais légèrement redondant (custom format déjà compressé). Non bloquant.

**Cron à configurer sur VPS :**
```bash
0 2 * * * DATABASE_URL="..." /opt/iox/scripts/backup-postgres.sh /opt/iox/backups >> /var/log/iox-backup.log 2>&1
```

---

## 6. État VPS readiness

Checklist complète : `notes/deployment-checklist-vps-pilote-ferme-iox.md`

Points restants (manuel — non automatisable sans accès VPS) :
- [ ] VPS Ubuntu 22.04 provisionné
- [ ] Domaine + SSL configuré
- [ ] PostgreSQL + Redis + MinIO installés
- [ ] `.env` backend/frontend remplis avec secrets réels
- [ ] Migrations Prisma appliquées
- [ ] Backup cron configuré et testé
- [ ] Smoke tests post-déploiement passés

---

## 7. Risques restants

| Risque | Criticité | Action |
|---|---|---|
| VPS non provisionné | Haute | Bloquer déploiement pilote jusqu'à infra prête |
| Stripe en mode test | Normale | Intentionnel pour pilote fermé. Documenter aux coopératives |
| RGPD non finalisé | Haute | Informer oralement les participants pilotes — accepté pour pilote fermé |
| Monitoring absent | Moyenne | Surveiller manuellement PM2 logs + `pm2 monit` |
| Backup pas encore testé sur VPS | Haute | Lancer test manuel avant premier déploiement |

---

## 8. Décision finale M76

| | Décision |
|---|---|
| **GO fixes sécurité** | ✅ S1+S2+S3 corrigés, +13 tests verts |
| **GO pilote fermé** | ✅ CONDITIONNEL — après provisionnement VPS + backup opérationnel |
| **NO-GO production publique** | ❌ RGPD + Stripe live + monitoring requis |

---

## 9. Prochain mandat recommandé

**Mandat 77** :
- **A** : Provisionnement VPS + déploiement pilote fermé (nécessite accès infra)
- **B** : PWA — manifest.json + next-pwa + icônes (6-8h dev, aucun prérequis infra)
- **C** : Pages légales frontend (CGU, mentions légales) — intégration dans Next.js
- **D** : Monitoring — UptimeRobot + Sentry setup (4h ops)
