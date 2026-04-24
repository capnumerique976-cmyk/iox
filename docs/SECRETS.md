# Gestion des secrets & configuration — IOX

## 1. Où vivent les variables

| Fichier                      | Usage                                                  |
| ---------------------------- | ------------------------------------------------------ |
| `apps/backend/.env.example`  | Modèle backend (commit, jamais de vrai secret)         |
| `apps/backend/.env`          | Valeurs locales, **jamais commit** (dans `.gitignore`) |
| `apps/frontend/.env.example` | Modèle frontend                                        |
| `apps/frontend/.env.local`   | Valeurs locales Next.js, **jamais commit**             |
| `.env.example` (racine)      | Stub documentaire uniquement                           |

## 2. Variables — source de vérité

Schéma typé et validé à chaque démarrage du backend : `apps/backend/src/common/config/env.validation.ts`.

### Obligatoires (toutes envs)

| Variable             | Contrainte                    |
| -------------------- | ----------------------------- |
| `DATABASE_URL`       | URL Postgres                  |
| `JWT_SECRET`         | ≥ 32 caractères               |
| `JWT_REFRESH_SECRET` | ≥ 32 caractères, ≠ JWT_SECRET |
| `MINIO_ACCESS_KEY`   | ≥ 3 caractères                |
| `MINIO_SECRET_KEY`   | ≥ 8 caractères                |

### Optionnelles (avec défaut)

| Variable                                     | Défaut                         |
| -------------------------------------------- | ------------------------------ |
| `APP_ENV`                                    | `development`                  |
| `APP_PORT`                                   | `3001`                         |
| `FRONTEND_URL`                               | `http://localhost:3000`        |
| `JWT_EXPIRES_IN`                             | `15m`                          |
| `JWT_REFRESH_EXPIRES_IN`                     | `7d`                           |
| `MINIO_ENDPOINT`                             | `localhost`                    |
| `MINIO_PORT`                                 | `9000`                         |
| `MINIO_BUCKET`                               | `iox-documents`                |
| `MINIO_USE_SSL`                              | `false`                        |
| `REDIS_URL`                                  | _(facultatif)_                 |
| `SMTP_HOST / PORT / USER / PASS / MAIL_FROM` | _(facultatif — MailHog local)_ |

### Frontend (public, côté client)

| Variable               | Rôle                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Force l'URL publique de l'API. Laisser vide derrière reverse-proxy. |
| `BACKEND_INTERNAL_URL` | Proxy server-side Next → Nest (Docker surtout).                     |

**Règle** : tout ce qui commence par `NEXT_PUBLIC_` est **exposé au navigateur**. N'y mettre aucun secret.

## 3. Garde-fous automatiques

Au démarrage de `apps/backend`, la validation refuse le boot si :

- une variable obligatoire manque ou ne valide pas le schéma ;
- `APP_ENV` est `staging` / `production` **et** un secret connu est utilisé
  (`change-me-…`, `minioadmin`, `secret`, `password`, …) ;
- `JWT_SECRET === JWT_REFRESH_SECRET` en non-dev.

Message d'erreur au boot : liste à puces claire pour chaque variable fautive.

## 4. Procédure de rotation (préprod / prod)

La rotation elle-même ne peut pas être effectuée depuis le dépôt — elle doit
être exécutée manuellement sur l'hôte cible.

### 4.1 Générer de nouveaux secrets

```bash
# JWT (deux valeurs DIFFÉRENTES)
openssl rand -hex 48

# MinIO / S3
openssl rand -base64 32  # access key
openssl rand -base64 48  # secret key
```

### 4.2 Appliquer

1. Mettre à jour le gestionnaire de secrets (Vault, AWS Secrets Manager,
   GCP Secret Manager, Doppler, 1Password Connect, Kubernetes Secret, …).
2. Redémarrer le backend — le schéma de validation refuse le boot si la
   rotation est incomplète.
3. Invalider les sessions utilisateur si `JWT_SECRET` est rotationné
   (côté métier : `refresh_tokens` en DB peut être purgé pour forcer
   un re-login global).

### 4.3 Vérifier

- `GET /api/v1/health` → `status: "ok"` avec DB + storage up.
- Test login/logout depuis le frontend.

## 5. Matrice GitHub Actions (CI)

La CI actuelle ne requiert **aucun secret** : elle exécute typecheck, lint,
tests unitaires et build — tous réalisables avec Prisma Client généré sans
DB réelle.

Si un jour un job E2E tournant contre une DB réelle est ajouté :

- `DATABASE_URL_TEST` — URL Postgres de test (fournir via un service Docker
  Postgres dans le workflow, pas via un secret) ;
- `JWT_SECRET_TEST`, `JWT_REFRESH_SECRET_TEST` — valeurs fortes
  (`openssl rand -hex 48`), stockées en **GitHub → Settings → Secrets**.

## 6. Bonnes pratiques

- Ne jamais commit `.env`, `.env.local`, `.env.production`.
- Ne jamais logger une variable contenant `SECRET`, `PASSWORD`, `KEY`.
- Ne jamais renvoyer un JWT dans une URL (toujours en header ou body JSON).
- Auditer périodiquement : `git log --all --full-history -p -- '**/.env*'`
  pour vérifier qu'aucun fichier `.env` réel n'est jamais arrivé dans
  l'historique (si c'est le cas : rotation immédiate + `git filter-repo`).
