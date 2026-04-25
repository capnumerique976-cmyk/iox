# Smoke authentifié — guide opérationnel

> `scripts/smoke-authenticated.sh` — parcours d'un vrai utilisateur connecté pour attraper les régressions que `smoke-check.sh` (public, HTTP 200) ne voit pas.

---

## Quand le lancer

- **Obligatoire après chaque déploiement frontend** (avant d'annoncer "vert").
- **Recommandé avant tout PR touchant auth / api-client / guards**.
- Utile pour valider qu'un rollback a bien restauré l'état fonctionnel.

## Comptes de smoke

### Local (docker-compose + seed)

Le seed Prisma crée 4 comptes :

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| `admin@iox.mch` | `Admin@IOX2026!` | ADMIN |
| `coordinateur@iox.mch` | `Coord@IOX2026!` | COORDINATOR |
| `valideur@iox.mch` | `Valid@IOX2026!` | MARKET_VALIDATOR |
| `seller.demo@iox.mch` | `Seller@IOX2026!` | MARKETPLACE_SELLER |

Usage minimal :

```bash
BASE_URL=http://localhost:3000 \
SMOKE_EMAIL='admin@iox.mch' \
SMOKE_PASSWORD='Admin@IOX2026!' \
./scripts/smoke-authenticated.sh
```

### Staging / prod

⚠️ **Ne JAMAIS utiliser un compte admin humain pour le smoke**. Crée un compte dédié, rôle ADMIN ou plus restreint selon la couverture voulue, mot de passe généré, jamais réutilisé.

Conventions :

- Email : `smoke+<env>@iox.mch` (ex. `smoke+prod@iox.mch`, `smoke+staging@iox.mch`).
- Mot de passe : ≥ 24 car, généré via `openssl rand -base64 24`.
- Rotation : tous les 90 jours (cron `ops-rotate-smoke-password`).

## Stockage des credentials

### ✅ Méthode recommandée : fichier env local

Le script auto-charge dans cet ordre :

1. `$SMOKE_ENV_FILE` (override explicite)
2. `~/.iox-smoke.env`
3. `scripts/.iox-smoke.env` (ne sera JAMAIS commit — ligne dans `.gitignore`)

Exemple :

```bash
cat > ~/.iox-smoke.env <<'EOF'
BASE_URL=https://iox.mycloud.yt
SMOKE_EMAIL=smoke+prod@iox.mch
SMOKE_PASSWORD=REMPLACE_PAR_LE_MDP_GENERE
EOF
chmod 600 ~/.iox-smoke.env

./scripts/smoke-authenticated.sh
```

Le script affiche `📄 env chargé depuis …` s'il a trouvé un fichier.

### ✅ Override ponctuel

```bash
SMOKE_ENV_FILE=./scripts/.iox-smoke.prod.env ./scripts/smoke-authenticated.sh
```

### ❌ À ne PAS faire

- Coller le mot de passe directement dans la ligne de commande (il est conservé dans l'historique shell — `history` le révèle).
- Utiliser un client (Notes, Mail, Messages macOS) qui auto-transforme `'` en `'` / `"` en `"`. Bash ne traite PAS les guillemets courbes comme des délimiteurs. Le script détecte ce cas et refuse.
- Mettre un espace en fin de mot de passe (classique des copier-coller depuis un doc). Le script trim leading/trailing automatiquement.

## Que teste le script

Le script applique un **modèle tiered** :

- **Endpoints obligatoires (Lot 6)** : doivent répondre 200. Un échec = NO-GO.
- **Endpoints optionnels (Lot 7+)** : un 404/501 est accepté en `⊝ skip`. Tout autre échec (401/403/5xx) reste un ✗.
- **Auto-détection Lot 7** via probe `GET /referentiel`. Override possible : `SMOKE_LOT7=1` (force présent) ou `SMOKE_LOT7=0` (force absent).

Détail :

1. `POST /api/v1/auth/login` — confirme creds, extrait `accessToken` / `refreshToken` / `role`.
2. **Endpoints API authentifiés (obligatoires Lot 6)** :
   - Dashboard : `dashboard/stats`, `dashboard/alerts`, `dashboard/recent-activity`
   - Listings : `beneficiaries`, `products`, `companies`, `inbound-batches`, `product-batches`, `label-validations`, `distributions`, `incidents`, `documents`, `supply-contracts`, `transformation-operations`
   - Admin (si rôle ADMIN, **préfixes corrigés**) : `users`, `audit-logs`, `admin/memberships/diagnostic`, `admin/memberships/orphan-sellers`, `admin/memberships/orphan-memberships`, `admin/memberships`, `marketplace/review-queue`, `marketplace/review-queue/stats/pending`, `marketplace/quote-requests`, `marketplace/seller-profiles`
   - Chaque réponse 200 doit ne PAS contenir un champ `.error` dans le body (200 + erreur logique = ✗).
3. `POST /api/v1/auth/refresh` — sanity sur le refresh flow.
4. **Pages frontend HTML** :
   - **Lot 6 obligatoires** : `/dashboard`, `/admin`, `/beneficiaries`, `/products`, `/companies`, `/inbound-batches`, `/product-batches`, `/transformation-operations`, `/traceability`, `/label-validations`, `/distributions`, `/incidents`, `/documents`, `/supply-contracts`, `/seller/dashboard`, `/admin/users`, `/admin/review-queue`, `/admin/memberships`, `/admin/diagnostics`, `/admin/sellers`, `/admin/rfq`
   - **Lot 7 conditionnels** : `/referentiel`, `/production`, `/marketplace-hub`, `/distribution`
5. ⚠️ Le HTML 200 valide le rendu shell mais PAS les fetchs client. Pour ça, recette manuelle `docs/ops/LOT7BIS-VALIDATION.md`.

### Préfixes admin corrigés (vs versions antérieures)

| Avant (faux, 404) | Après (correct) |
|-------------------|-----------------|
| `/api/v1/memberships/diagnostic` | `/api/v1/admin/memberships/diagnostic` |
| `/api/v1/seller-profiles` | `/api/v1/marketplace/seller-profiles` |
| `/api/v1/review-queue` | `/api/v1/marketplace/review-queue` |
| `/api/v1/quote-requests` | `/api/v1/marketplace/quote-requests` |

## Diagnostic des échecs

Le script imprime désormais le code HTTP et un diagnostic ciblé :

| Code | Cause probable |
|------|----------------|
| `000` | Réseau / DNS / TLS / proxy — le backend n'a pas répondu |
| `401` | Creds invalides — compte inconnu, mauvais mot de passe, compte désactivé |
| `403` | Middleware bloque (CORS, CSRF, geoblock) |
| `404` | Mauvais `BASE_URL` ou `/api/v1/*` n'est pas proxifié |
| `429` | Throttler (10 logins / min) — attendre |
| `5xx` | Bug backend — voir logs serveur |

## Retour d'expérience — Lot 7 bis (avril 2026)

Premier smoke prod → "login impossible".

Causes réelles identifiées :

1. **Creds invalides** (priorité 1). L'email `admin@iox.mycloud.yt` n'existe pas dans la base : le seed crée `admin@iox.mch`. L'opérateur a testé un compte imaginaire.
2. **Guillemets Unicode courbes** dans le mot de passe (`'...'` au lieu de `'...'`), introduits par un copier-coller depuis une note macOS. Bash les prend pour du texte littéral, le mot de passe envoyé au backend n'est donc pas celui voulu.
3. **Espace fin de mot de passe** (`'xxx '` au lieu de `'xxx'`) dans le même copier-coller.

Fix appliqué dans le script (Lot 8) :

- chargement auto de `~/.iox-smoke.env` (plus besoin de taper les creds) ;
- détection + refus explicite des guillemets courbes ;
- trim automatique des espaces en début/fin ;
- construction du payload JSON via `jq` (neutralise les caractères spéciaux) ;
- message d'erreur nommé : HTTP code + cause probable + email + longueur de mot de passe.

## Template de `.iox-smoke.env`

Voir `scripts/.iox-smoke.env.example` — à copier en `scripts/.iox-smoke.env` (gitignoré) ou `~/.iox-smoke.env`.
