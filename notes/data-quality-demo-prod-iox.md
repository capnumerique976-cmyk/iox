# Qualité des données & Séparation Démo / Production — IOX

> Ce document définit les conventions de données, les procédures de nettoyage démo et les contrôles qualité à appliquer avant et pendant le pilote terrain.  
> Date : 2026-05-11

---

## 1. Convention des données de démonstration

### Règle principale

Toutes les données de démonstration (seed) doivent être **clairement identifiables** pour ne jamais être confondues avec des données réelles.

### Convention email

Les comptes démo utilisent le préfixe `demo_` ou le domaine `@demo.iox` :

| Type | Format email | Exemple |
|---|---|---|
| Vendeur démo | `seller@demo.iox` ou `demo_seller_[n]@iox.re` | `demo_coop_mahajanga@iox.re` |
| Acheteur démo | `buyer@demo.iox` ou `demo_buyer_[n]@iox.re` | `demo_buyer_reunion@iox.re` |
| Admin démo | `admin@demo.iox` | `demo_admin@iox.re` |

### Convention noms d'entreprises

Les noms d'entreprises des comptes démo sont préfixés par `[DEMO]` :

- `[DEMO] Coopérative Agricole de Mayotte`
- `[DEMO] Épicerie Fine Réunion`
- `[DEMO] Importateur Test`

Cette convention garantit qu'une recherche rapide sur `[DEMO]` ou `demo_` permet de retrouver toutes les données de test.

---

## 2. Scripts seed — Localisation et usage

### Localisation

Le script de seed principal est situé dans :
```
apps/backend/prisma/seed.ts
```

Scripts associés potentiels :
```
apps/backend/prisma/seed-demo.ts    # données démo enrichies
apps/backend/scripts/seed-demo.sh   # wrapper shell
```

### Exécution

```bash
# Depuis le répertoire backend
cd apps/backend

# Seed de base (schéma minimal)
pnpm exec prisma db seed

# Seed démo (données de démonstration complètes)
pnpm run seed:demo
```

### Règle absolue

**Les scripts seed ne doivent jamais être exécutés en production.**

Ces scripts créent des données fictives qui pourraient corrompre la base de données de production, créer des comptes non réels et fausser les statistiques et KPIs.

---

## 3. Protection contre l'exécution du seed en production

### Vérification dans le code

Le script seed doit impérativement vérifier l'environnement avant de s'exécuter :

```typescript
// apps/backend/prisma/seed.ts
async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERREUR : Le script seed ne peut pas être exécuté en production.');
    console.error('Définir NODE_ENV=production empêche le seed.');
    process.exit(1);
  }
  // ... suite du seed
}
```

### Comment vérifier que la protection est en place

```bash
# Vérifier que la vérification NODE_ENV existe dans le seed
grep -n "NODE_ENV" apps/backend/prisma/seed.ts
grep -n "production" apps/backend/prisma/seed.ts

# Résultat attendu : au moins une ligne contenant la vérification
```

Si la protection n'est pas en place, l'ajouter en priorité avant tout déploiement en production.

### Mesure complémentaire

Sur le VPS de production : ne pas inclure les scripts seed dans le déploiement, ou les rendre non exécutables :

```bash
chmod 000 /opt/iox/apps/backend/prisma/seed.ts
chmod 000 /opt/iox/apps/backend/dist/prisma/seed.js
```

---

## 4. Nettoyage des données démo avant le pilote réel

Avant de lancer le pilote avec de vrais utilisateurs, nettoyer intégralement les données démo de la base de production.

### Étape 1 — Détecter les données démo existantes

```sql
-- Comptes avec email démo
SELECT id, email, role, company_name, created_at
FROM users
WHERE email LIKE 'demo_%'
   OR email LIKE '%@demo.%'
   OR company_name LIKE '[DEMO]%';

-- Offres créées par des vendeurs démo
SELECT o.id, o.title, o.status, u.email AS seller_email
FROM offers o
JOIN users u ON u.id = o.seller_id
WHERE u.email LIKE 'demo_%'
   OR u.email LIKE '%@demo.%';

-- RFQ impliquant des comptes démo
SELECT r.id, r.status, buyer.email, seller.email
FROM rfqs r
JOIN users buyer ON buyer.id = r.buyer_id
JOIN users seller ON seller.id = r.seller_id
WHERE buyer.email LIKE 'demo_%'
   OR seller.email LIKE 'demo_%'
   OR buyer.email LIKE '%@demo.%'
   OR seller.email LIKE '%@demo.%';
```

### Étape 2 — Sauvegarde avant nettoyage

```bash
# Toujours faire un backup avant toute suppression
pg_dump -h localhost -U iox_user -d iox_prod \
  -F c -f /opt/iox/backups/iox_avant_nettoyage_$(date +%Y%m%d_%H%M%S).dump
```

### Étape 3 — Suppression des données démo

À exécuter avec précaution, dans cet ordre (pour respecter les contraintes de clés étrangères) :

```sql
-- IMPORTANT : adapter selon le schéma Prisma réel
-- Toujours tester sur un environnement de staging avant la production

BEGIN;

-- Identifier les IDs des utilisateurs démo
WITH demo_users AS (
  SELECT id FROM users
  WHERE email LIKE 'demo_%'
     OR email LIKE '%@demo.%'
)
-- Supprimer dans l'ordre des dépendances
DELETE FROM payments WHERE rfq_id IN (
  SELECT id FROM rfqs WHERE buyer_id IN (SELECT id FROM demo_users)
    OR seller_id IN (SELECT id FROM demo_users)
);

DELETE FROM rfqs WHERE buyer_id IN (SELECT id FROM demo_users)
  OR seller_id IN (SELECT id FROM demo_users);

DELETE FROM offers WHERE seller_id IN (SELECT id FROM demo_users);

DELETE FROM documents WHERE user_id IN (SELECT id FROM demo_users);

DELETE FROM users
WHERE email LIKE 'demo_%'
   OR email LIKE '%@demo.%';

-- Vérifier avant de valider
SELECT COUNT(*) FROM users WHERE email LIKE 'demo_%' OR email LIKE '%@demo.%';
-- Doit retourner 0

COMMIT;
```

### Étape 4 — Vérification post-nettoyage

```sql
-- Vérification finale : aucune donnée démo ne doit subsister
SELECT email FROM users WHERE email LIKE 'demo_%' OR email LIKE '%@demo.%';
SELECT company_name FROM users WHERE company_name LIKE '[DEMO]%';
```

### Étape 5 — Réinitialisation des séquences (optionnel)

Si les auto-incréments ont été pollués par les données démo et que des IDs visuellement incohérents posent un problème :

```sql
-- Adapter selon les séquences réelles du schéma
-- Ne faire que si nécessaire et si la base est vide de données réelles
SELECT setval('users_id_seq', 1, false);
SELECT setval('offers_id_seq', 1, false);
```

---

## 5. Séparation des bases de données par environnement

| Environnement | Base de données | Usage |
|---|---|---|
| Développement local | `iox_dev` (localhost) | Développement quotidien, seed autorisé |
| Staging / Préprod | `iox_staging` (VPS staging) | Tests d'intégration, smoke tests, démos |
| Production pilote | `iox_prod` (VPS production) | Données réelles, seed interdit |

### Règle stricte

**La `DATABASE_URL` de production ne doit jamais apparaître dans un fichier de configuration local.** Utiliser uniquement les variables d'environnement du VPS (`.env` non commité, ou secrets manager).

### Vérification de la variable d'environnement

```bash
# Sur le VPS production, vérifier que la bonne base est utilisée
echo $DATABASE_URL | grep "iox_prod"
# Doit afficher quelque chose contenant "iox_prod"

# En développement local
echo $DATABASE_URL | grep "iox_dev"
# Doit afficher quelque chose contenant "iox_dev"
```

---

## 6. Contrôle des doublons

### Contraintes UNIQUE en base de données

Les colonnes suivantes doivent avoir des contraintes `UNIQUE` dans le schéma Prisma / PostgreSQL :

| Table | Colonne | Justification |
|---|---|---|
| `users` | `email` | Un seul compte par email |
| `users` | `siren` | Un SIREN unique par entreprise |
| `users` | `siret` | Si collecté (SIRET unique) |
| `offers` | `(seller_id, sku)` | Si les SKU vendeur sont gérés |

### Vérification des contraintes

```sql
-- Vérifier les contraintes UNIQUE existantes sur la table users
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(c.oid) AS constraint_definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'users'
  AND c.contype = 'u';
```

Si la contrainte `UNIQUE` sur `email` ou `siren` est absente, l'ajouter via une migration Prisma :

```prisma
// schema.prisma
model User {
  email String @unique
  siren String? @unique
  // ...
}
```

```bash
# Générer et appliquer la migration
cd apps/backend
pnpm exec prisma migrate dev --name add-unique-constraints
```

### Détection de doublons existants

```sql
-- Détecter les doublons d'email (ne devrait pas exister si la contrainte UNIQUE est en place)
SELECT email, COUNT(*) AS occurrences
FROM users
GROUP BY email
HAVING COUNT(*) > 1;

-- Détecter les doublons de SIREN
SELECT siren, COUNT(*) AS occurrences
FROM users
WHERE siren IS NOT NULL
GROUP BY siren
HAVING COUNT(*) > 1;
```

---

## 7. Checklist avant lancement pilote

| # | Vérification | Responsable | Statut |
|---|---|---|---|
| 1 | Aucune donnée démo dans la base de production (`demo_` / `@demo.`) | Admin tech | A faire |
| 2 | Emails réels pour tous les utilisateurs pilote (coopératives + acheteurs) | Admin terrain | A faire |
| 3 | Script seed protégé contre l'exécution en `NODE_ENV=production` | Dev | A vérifier |
| 4 | Variable `DATABASE_URL` production non exposée en local | Dev | A vérifier |
| 5 | Contraintes `UNIQUE` sur `email` et `siren` vérifiées en base | Admin tech | A faire |
| 6 | Aucun doublon d'email ou de SIREN détecté | Admin tech | A faire |
| 7 | Backup de la base de production effectué avant le J-Jour pilote | Admin tech | A faire |
| 8 | Staging testé avec données réalistes (non démo) avant production | Dev | A faire |
