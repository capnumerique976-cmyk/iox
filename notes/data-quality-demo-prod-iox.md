# Qualité des données — Séparation Démo / Production — IOX

> Conventions, procédures de nettoyage et contrôles qualité à appliquer avant et pendant le pilote terrain.  
> Date : 2026-05-11 — Usage interne équipe technique IOX.

---

## 1. Le problème

Pendant le développement et les démonstrations, la base de données est peuplée avec des données fictives via le script seed (`seed.ts`). Ces données servent à rendre la plateforme présentable lors des démos investisseurs, des tests internes et des formations.

**Risque concret :** une coopérative réelle invitée sur la plateforme pilote peut voir des produits, des entreprises et des profils fictifs (ex. `[DEMO] Coopérative Agricole de Mayotte`) qui n'existent pas. Cela crée de la confusion, nuit à la crédibilité d'IOX et peut faire échouer le pilote avant même qu'il ait commencé.

**Conséquences possibles :**
- Une coopérative pense qu'il y a déjà des concurrents sur la plateforme alors qu'il n'y en a pas
- Un acheteur contacte un "vendeur" qui est en réalité un compte de démo sans personne derrière
- Les KPI du pilote sont faussés par des transactions générées automatiquement par le seed
- La confiance des premiers utilisateurs est irrémédiablement entamée

---

## 2. Conventions pour les données de démonstration

Toutes les données créées par le script seed doivent respecter des conventions qui les rendent immédiatement identifiables et filtrables.

### Convention emails

| Type de compte | Format email |
|---|---|
| Vendeur démo | `demo_seller_[n]@iox.example` — ex. `demo_coop_mahajanga@iox.example` |
| Acheteur démo | `demo_buyer_[n]@iox.example` — ex. `demo_buyer_reunion@iox.example` |
| Admin démo | `demo_admin@iox.example` |
| Utilisateur test générique | `demo_user_[n]@iox.example` |

**Règle :** tous les emails démo utilisent le domaine `@iox.example` (domaine réservé RFC 2606, jamais utilisé en production réelle) ou le préfixe `demo_`.

### Convention noms d'entreprises

Tous les noms d'entreprises des comptes démo sont préfixés par `[DEMO]` :

- `[DEMO] Coopérative Agricole de Mayotte`
- `[DEMO] Épicerie Fine Réunion SARL`
- `[DEMO] Importateur Océan Indien`

### Convention prix et données

- Les prix doivent être clairement irréels : `0.01`, `9999.99`, ou des valeurs rondes impossibles (`1000 €/kg de basilic`)
- Les descriptions produit peuvent contenir la mention `[DÉMO — données fictives]`
- Les photos utilisent des images libres de droits génériques (pas des photos de vraies coopératives)

### Avantage de ces conventions

Une recherche rapide sur `demo_`, `@iox.example` ou `[DEMO]` permet de retrouver et supprimer toutes les données de test en un seul passage.

---

## 3. Localisation du script seed

Le script seed principal se trouve dans :

```
apps/backend/prisma/seed.ts
```

Scripts associés potentiels :

```
apps/backend/prisma/seed-demo.ts    # données démo enrichies
apps/backend/scripts/seed-demo.sh   # wrapper shell
```

### Exécution (développement et démo uniquement)

```bash
# Depuis le répertoire backend
cd apps/backend

# Seed de base
pnpm exec prisma db seed

# Seed démo complet
pnpm run seed:demo
```

**Règle absolue :** ces commandes ne doivent jamais être exécutées sur l'environnement de production. Le script vérifie `NODE_ENV` avant de s'exécuter (voir section 4).

---

## 4. Protection de la production contre l'exécution du seed

### Vérification NODE_ENV dans le code

Le script seed doit impérativement vérifier l'environnement avant toute action :

```typescript
// apps/backend/prisma/seed.ts
async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERREUR : Le script seed ne peut pas être exécuté en production.');
    console.error('Arrêt immédiat pour protéger les données de production.');
    process.exit(1);
  }
  // ... suite du seed uniquement si dev ou staging
}
```

### Comment vérifier que la protection est en place

```bash
grep -n "NODE_ENV\|production" apps/backend/prisma/seed.ts | head -10
```

**Résultat attendu :** au moins une ligne contenant la vérification `NODE_ENV === 'production'` avec un `process.exit(1)`.

Si la protection est absente : l'ajouter immédiatement avant tout déploiement en production. C'est un prérequis non négociable.

### Mesure complémentaire sur le VPS de production

Rendre les scripts seed non exécutables sur le serveur de production :

```bash
chmod 000 /opt/iox/apps/backend/prisma/seed.ts
chmod 000 /opt/iox/apps/backend/dist/prisma/seed.js
```

---

## 5. Détection des données de démonstration en base

Ces requêtes permettent de détecter si des données démo subsistent dans la base de données.

```sql
-- Détecter les comptes démo
SELECT id, email, "createdAt" FROM users 
WHERE email LIKE 'demo_%' OR email LIKE '%@demo.%' OR email LIKE '%@iox.example'
ORDER BY "createdAt" DESC;
```

```sql
-- Détecter les produits démo
SELECT id, title, "createdAt" FROM marketplace_offers
WHERE title LIKE '[DEMO]%' OR title LIKE 'DEMO%'
ORDER BY "createdAt" DESC;
```

```sql
-- Compter le total de données démo (vue rapide)
SELECT 
  (SELECT COUNT(*) FROM users WHERE email LIKE 'demo_%' OR email LIKE '%@iox.example') AS comptes_demo,
  (SELECT COUNT(*) FROM marketplace_offers WHERE title LIKE '[DEMO]%') AS produits_demo;
```

Si ces requêtes retournent des lignes en environnement de production : procéder au nettoyage (section 6) avant d'inviter les vraies coopératives.

---

## 6. Procédure de nettoyage avant le pilote réel

### Étape 1 — Backup obligatoire avant toute suppression

```bash
# Toujours sauvegarder avant de supprimer
pg_dump -h localhost -U iox_user -d iox_prod \
  -F c -f /opt/iox/backups/iox_avant_nettoyage_$(date +%Y%m%d_%H%M%S).dump

# Vérifier que le fichier existe et a une taille cohérente
ls -lh /opt/iox/backups/
```

### Étape 2 — Identifier toutes les données démo

Exécuter les requêtes de détection de la section 5. Conserver le résultat pour vérification post-nettoyage.

### Étape 3 — Supprimer les données démo

```sql
BEGIN;

-- Identifier les IDs des utilisateurs démo
CREATE TEMP TABLE demo_user_ids AS
  SELECT id FROM users
  WHERE email LIKE 'demo_%'
     OR email LIKE '%@demo.%'
     OR email LIKE '%@iox.example';

-- Supprimer dans l'ordre des dépendances (clés étrangères)
DELETE FROM payments
  WHERE "buyerId" IN (SELECT id FROM demo_user_ids)
     OR "sellerId" IN (SELECT id FROM demo_user_ids);

DELETE FROM quote_requests
  WHERE "buyerId" IN (SELECT id FROM demo_user_ids)
     OR "sellerId" IN (SELECT id FROM demo_user_ids);

DELETE FROM marketplace_offers
  WHERE "sellerId" IN (SELECT id FROM demo_user_ids);

DELETE FROM compliance_documents
  WHERE "userId" IN (SELECT id FROM demo_user_ids);

DELETE FROM users
  WHERE id IN (SELECT id FROM demo_user_ids);

-- Vérification avant validation
SELECT COUNT(*) FROM users
  WHERE email LIKE 'demo_%' OR email LIKE '%@iox.example';
-- Doit retourner 0

ROLLBACK; -- Remplacer par COMMIT; uniquement si le COUNT retourne 0
```

### Étape 4 — Vérification post-nettoyage

```sql
-- Aucun compte démo ne doit subsister
SELECT email FROM users WHERE email LIKE 'demo_%' OR email LIKE '%@iox.example';

-- Aucun produit démo ne doit subsister
SELECT title FROM marketplace_offers WHERE title LIKE '[DEMO]%';
```

Les deux requêtes doivent retourner zéro ligne. Si ce n'est pas le cas, compléter le nettoyage avant de continuer.

---

## 7. Séparation des bases de données par environnement

| Environnement | Base de données | Seed autorisé | Usage |
|---|---|---|---|
| Développement local | `iox_dev` (localhost) | Oui | Développement quotidien, tests locaux |
| Staging / Préprod | `iox_staging` (VPS staging) | Oui (avec prudence) | Tests d'intégration, smoke tests, démos investisseurs |
| Production pilote | `iox_prod` (VPS production) | **Non** | Données réelles, utilisateurs réels |

### Règle de séparation

La variable `DATABASE_URL` de production ne doit jamais apparaître dans un fichier de configuration local (`.env`, `.env.local`). Elle ne doit exister que dans les variables d'environnement du VPS de production.

### Vérifier que la bonne base est utilisée

```bash
# Sur le VPS production — doit contenir "iox_prod"
echo $DATABASE_URL | grep "iox_prod"

# En développement local — doit contenir "iox_dev"
echo $DATABASE_URL | grep "iox_dev"
```

Si la commande ne retourne rien : vérifier le fichier `.env` actif et la configuration du serveur.

---

## 8. Contraintes d'unicité

Les colonnes suivantes doivent avoir des contraintes `UNIQUE` dans le schéma Prisma / PostgreSQL.

| Table | Colonne | Justification |
|---|---|---|
| `users` | `email` | Un seul compte par adresse email |
| `users` | `siren` | Un SIREN unique par entreprise (si collecté) |
| `users` | `siret` | Un SIRET unique si collecté |

### Vérifier les contraintes existantes

```sql
SELECT
  conname AS contrainte,
  pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
WHERE t.relname = 'users'
  AND c.contype = 'u';
```

### Ajouter une contrainte manquante

Si la contrainte `UNIQUE` sur `email` ou `siren` est absente, l'ajouter via une migration Prisma :

```prisma
// schema.prisma
model User {
  email String @unique
  siren String? @unique
}
```

```bash
cd apps/backend
pnpm exec prisma migrate dev --name add-unique-email-siren
```

---

## 9. Checklist avant le pilote — 8 points à cocher

À compléter **avant** d'envoyer les premières invitations aux vraies coopératives.

- [ ] **Backup effectué** — la base de production a été sauvegardée avant toute opération
- [ ] **Aucune donnée démo en production** — les requêtes de détection (section 5) retournent zéro résultat
- [ ] **Script seed protégé** — `grep -n "NODE_ENV\|production" apps/backend/prisma/seed.ts` confirme la protection
- [ ] **DATABASE_URL de production non exposée en local** — vérification dans les fichiers `.env` des développeurs
- [ ] **Contrainte UNIQUE sur `email` présente** — vérifiée via la requête SQL (section 8)
- [ ] **Contrainte UNIQUE sur `siren` présente ou documentée comme optionnelle** — vérifiée ou décision documentée
- [ ] **Aucun doublon d'email détecté en base** — `SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1` retourne zéro
- [ ] **Staging testé avec données réalistes** — le flow complet RFQ → paiement a été validé sur staging avant d'ouvrir la production aux pilotes
