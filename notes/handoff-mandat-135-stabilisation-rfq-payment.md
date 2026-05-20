# Handoff — Mandat 135 : Stabilisation paiement RFQ + correction anciennes RFQ WON

**Date** : 2026-05-19  
**Commit** : `0635417` — `feat(payments): M135 — admin setAgreedAmount + M133 regression tests`  
**Statut** : ✅ **Code mergé localement — déploiement backend à décider**

---

## Phase 1 — Résultats audit

| Composant | État avant M135 | Risque |
|---|---|---|
| `updateStatus` → WON | ✅ Guard correct | Aucun |
| `createCheckoutSession` | ✅ Lit `rfq.agreedAmountCents`, ignore client | Aucun |
| FSM rôle WON | ✅ Seller/staff uniquement | Aucun |
| Test `null` → 400 | ✅ Existait | Aucun |
| Test `amountCents=0` → 400 | ❌ Manquait | Régression possible |
| Test body client ignoré | ❌ Manquait | Régression possible |
| Test WON depuis NEGOTIATING | ❌ Manquait | Couverture incomplète |
| Endpoint admin correction montant | ❌ Absent | Blocage checkout anciennes RFQ |

---

## Phase 2 — Nouveaux tests ajoutés

### `payments.service.spec.ts` (+2 tests)

- **`M133 — agreedAmountCents = 0 → BadRequestException`** : vérifie que la
  guard `!serverAmountCents || serverAmountCents <= 0` couvre aussi le zéro.
- **`M133 — body amountCents ignoré, seul rfq.agreedAmountCents compte`** :
  le client envoie `amountCents: 1`, le serveur utilise `100000` (depuis rfq).
  Vérifie `payment.create.amountCents = 100000` et que le provider reçoit bien
  `amountCents: 100000`.

### `quote-requests.service.spec.ts` (+1 test updateStatus)

- **`M133 — WON auto-compute depuis NEGOTIATING (unitPrice × qty)`** :
  `500 USD × 3 = 1 500 → 150 000 centimes`. Vérifie
  `agreedAmountCents: 150000, agreedCurrency: 'USD'` dans l'update Prisma.

---

## Phase 3 — Endpoint admin `setAgreedAmount`

### API

```
PATCH /api/v1/marketplace/quote-requests/:id/agreed-amount
```

**Rôles autorisés** : `ADMIN`, `COORDINATOR`

**Body** :
```json
{
  "agreedAmountCents": 250000,
  "agreedCurrency": "EUR",
  "reason": "Correction RFQ WON créée avant migration M133"
}
```

**Validations** :
- `agreedAmountCents` ≥ 1 (entier)
- `agreedCurrency` ∈ `EUR | USD` (normalisée UPPERCASE)
- RFQ doit exister (`404` sinon)
- RFQ doit être en statut `WON` (`400` sinon)
- `reason` optionnel, journalisé dans l'audit log

**Réponses** :
- `200` : RFQ mise à jour avec include complet (offre + buyer + seller)
- `400` : RFQ non WON / devise invalide
- `403` : rôle insuffisant (buyer / seller)
- `404` : RFQ introuvable

**Audit log** :
```
action: QUOTE_REQUEST_AGREED_AMOUNT_SET
previousData: { agreedAmountCents: null, agreedCurrency: null }
newData:      { agreedAmountCents: 250000, agreedCurrency: 'EUR' }
notes: "Correction RFQ WON créée avant migration M133"
```

### Cas d'usage

1. Admin liste les RFQ WON sans montant via la DB ou la future liste admin.
2. Pour chaque RFQ bloquée, il appelle :
   ```bash
   curl -X PATCH https://iox.mycloud.yt/api/v1/marketplace/quote-requests/{rfqId}/agreed-amount \
     -H 'Authorization: Bearer <admin-jwt>' \
     -H 'Content-Type: application/json' \
     -d '{
       "agreedAmountCents": 250000,
       "agreedCurrency": "EUR",
       "reason": "Correction RFQ WON créée avant migration M133"
     }'
   ```
3. Le buyer peut ensuite relancer le checkout normalement.

---

## Tests finaux

| Scope | Avant M135 | Après M135 |
|---|---|---|
| Suites backend | 89 | 89 |
| Tests backend | 1037 | **1048** (+11) |
| TypeScript | clean | clean |

---

## Déploiement requis

Le code est local (`main`, commit `0635417`). **Aucune migration DB nécessaire** —
les colonnes `agreed_amount_cents` et `agreed_currency` sont déjà présentes
depuis M133 (migration `20260519120000_m133_rfq_agreed_amount`).

### Commande de déploiement (à exécuter manuellement)

```bash
./deploy/vps/deploy.sh backend
```

Attend :
- `iox_backend` healthy
- `PATCH .../agreed-amount` avec rôle buyer → `403`
- `PATCH .../agreed-amount` avec rôle admin + RFQ WON NULL → `200`
- `PATCH .../agreed-amount` avec RFQ non WON → `400`

### Rollback

```bash
./deploy/vps/rollback.sh backend
```

Image précédente `iox-backend:prev` disponible (snapshot M134).

---

## Recherche des RFQ WON sans montant (SQL)

Pour identifier les RFQ affectées sur le VPS :

```bash
ssh rahiss-vps "docker exec iox_postgres sh -c \
  \"psql \\\$POSTGRES_USER -d \\\$POSTGRES_DB -c \\\"
    SELECT id, status, buyer_user_id, marketplace_offer_id, updated_at
    FROM quote_requests
    WHERE status = 'WON'
      AND agreed_amount_cents IS NULL
    ORDER BY updated_at DESC;
  \\\"\""
```

---

## Suite recommandée (M136+)

- Déployer ce backend (`./deploy/vps/deploy.sh backend`).
- Corriger les RFQ WON existantes avec l'endpoint admin.
- Ajouter une vue admin frontend listant les RFQ WON sans montant
  (filtrage `status=WON&agreedAmountCents=null`).
