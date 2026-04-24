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

1. `POST /api/v1/auth/login` — confirme que les creds fonctionnent, extrait `accessToken` / `refreshToken` / `role`.
2. 9 à 15 endpoints `GET` authentifiés sur le dashboard, les listings métier, et (si rôle ADMIN) les outils admin. Chaque appel :
   - doit être HTTP 200 ;
   - ne doit PAS avoir de champ `.error` dans le body (un endpoint peut 200 avec une erreur logique, c'est le piège qui nous a eus en Lot 7).
3. `POST /api/v1/auth/refresh` — vérifie qu'on peut renouveler l'access token (sanity sur le refresh flow Lot 8).
4. Pages frontend HTML — 11 routes doivent rendre un HTML 200 (le rendu shell est validé, mais attention : **ça ne valide PAS les fetchs client** — pour ça, il faut la recette manuelle `LOT7BIS-VALIDATION.md`).

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
