# Handoff — Mandat 134 : Déploiement backend M133 (server-locked payment amount)

**Date** : 2026-05-19  
**Commit déployé** : `57e94da` — `feat(payments): M133 — server-locked payment amount on RFQ WON`  
**Décision** : ✅ **GO**

---

## Résumé

M133 déployé avec succès sur `iox_backend` (VPS `rahiss-vps`).  
Migration Prisma `20260519120000_m133_rfq_agreed_amount` appliquée.  
0 régression sur les cohabitants (Telemante, Agora, Vavo, Hawa).

---

## Audit pré-déploiement

| Vérification | Résultat |
|---|---|
| Commit local `57e94da` | ✅ confirmé |
| Backend tests | 1037 verts |
| Frontend tests | 741 verts |
| VPS disque | 324 GB libres (16% utilisé) |
| VPS RAM | 26 GB dispo / 31 GB |
| VPS load | 0.03 / 0.14 / 0.22 |
| Telemante | ✅ up 4-7j |
| Agora | ✅ up 5-7j |
| Vavo | ✅ up 7-14h |
| Hawa | ✅ up 30h-2h |
| iox_backend (avant) | Up 2h (healthy) |
| iox_frontend | Up 2j (healthy) |

---

## Backup pré-déploiement

- **Stamp** : `20260519T192727Z`
- **Postgres** : pg_dump format custom — `/opt/apps/iox/backups/postgres/`
- **MinIO** : bucket `iox` vide — tar vide créé (normal, média stocké dans `iox-prod`)
- Rétention : 7 jours

---

## Déploiement

Script : `./deploy/vps/deploy.sh backend`

| Étape | Résultat |
|---|---|
| rsync (2766 files) | ✅ OK |
| snapshot `:prev` | ✅ `iox-backend:prev` tagué |
| build Docker | ✅ image `iox-backend:local` rebuilt |
| restart `iox_backend` | ✅ Up 16s → healthy |
| healthchecks | ✅ `/` 307, `/login` 200, `/api/v1/health` 200, `/api/v1/health/live` 200 |

**Durée totale** : ~2 min (rsync 50 KB/s + build ~30s)

---

## Migration DB

Migration `20260519120000_m133_rfq_agreed_amount` appliquée au boot via `prisma migrate deploy`.

Colonnes ajoutées sur `quote_requests` :

| Colonne | Type | Nullable |
|---|---|---|
| `agreed_amount_cents` | integer | YES |
| `agreed_currency` | character varying | YES |

Vérification directe en DB : ✅ 2 colonnes présentes.

---

## Smoke tests post-déploiement

| Test | Attendu | Résultat |
|---|---|---|
| `GET /api/v1/health` | 200 + `{"status":"ok"}` | ✅ 200 — database up, storage up |
| `GET /api/v1/health/live` | 200 | ✅ 200 |
| `POST /api/v1/payments/checkout-session` (unauthenticated) | 401 | ✅ 401 |
| `POST /api/v1/payments/webhook` (bad stripe-signature) | 400 | ✅ 400 |
| `GET /api/v1/invoices` (unauthenticated) | 401 | ✅ 401 |
| Secrets dans logs backend | 0 fuite | ✅ 0 ligne |
| Cohabitants intacts | tous up | ✅ Telemante / Agora / Vavo / Hawa inchangés |

---

## Comportement M133 en production

### RFQ WON existantes (avant migration)

Les RFQ WON créées avant `57e94da` ont `agreed_amount_cents = NULL`.  
Le service `createCheckoutSession` lit `rfq.agreedAmountCents` — si NULL, retourne **400**  
avec message : `"RFQ has no agreed amount. Transition to WON with an explicit amount."`

**Impact** : les anciens WON devront être ré-transitionés (QUOTED → WON avec `agreedAmountCents`)  
ou l'admin peut patcher manuellement la colonne si nécessaire.  
Aucun parcours buyer bloqué silencieusement — erreur explicite.

### Nouveaux parcours WON

1. Seller répond à une RFQ → status QUOTED avec `unitPrice` sur l'offre.  
2. Buyer accepte → QUOTED → WON : `agreedAmountCents` = `unitPrice × requestedQuantity` (auto-calculé).  
3. Buyer checkout → `POST /payments/checkout-session` sans `amountCents` dans le body.  
4. Backend lit `rfq.agreedAmountCents` — montant server-locked, client ne peut pas le modifier.

---

## Rollback disponible

```bash
./deploy/vps/rollback.sh backend
```

Image précédente : `iox-backend:prev` (toujours disponible sur le VPS).  
⚠ Le rollback ne revert pas la migration Prisma (colonnes nullable — non destructif).

---

## Suite recommandée

- **Aucune action urgente** : migration additive, guards OK, pas de régression.
- **Court terme** : tester un parcours WON complet en staging (Stripe test mode).
- **MP-NOTIF-RESEND-PROD-SETUP** : brancher Resend en prod pour les emails de confirmation paiement.
- **PAY-1 phase 2** : payout seller + KYB + commission automatique.
