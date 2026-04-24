# IOX — Runbooks exploitation

> Procédures opérationnelles pour incidents courants. À suivre dans l'ordre.
> Chaque runbook cible un symptôme observable (alerte, plainte utilisateur,
> dashboard rouge) et décrit les vérifications et actions.

**Conventions**
- `ADMIN` = rôle IOX interne (ADMIN, COORDINATOR, QUALITY_MANAGER)
- `REQ-ID` = identifiant de corrélation (en-tête `x-request-id`), visible
  dans les logs et dans les messages d'erreur du front depuis v2.1.
- Les endpoints cités sont tous préfixés par `/api/v1`.

---

## RB-01 — Un utilisateur signale « erreur » sur un écran

**Symptôme** : un seller / buyer / staff IOX voit un bandeau rouge avec un
code (`FORBIDDEN`, `NOT_FOUND`, `INTERNAL_SERVER_ERROR`…) et un identifiant
`#XXXXXXXX` cliquable.

1. **Récupérer le Request ID.** Demander à l'utilisateur de cliquer sur le
   badge `#XXXXXXXX` dans le message d'erreur — il est automatiquement
   copié dans le presse-papier. Ce préfixe fait 8 caractères ; l'ID complet
   est dans l'en-tête `x-request-id` de la réponse HTTP.
2. **Chercher dans les logs backend.** Tous les logs applicatifs sont
   préfixés par `[<REQ-ID>]` (interceptor + exception filter). Recherche :
   ```bash
   # En local
   pnpm --filter @iox/backend logs | grep "<REQ-ID>"
   # En prod (Loki / Datadog / équivalent)
   {app="iox-backend"} |= "<REQ-ID>"
   ```
3. **Classer** :
   - `FORBIDDEN` → ownership ou rôle. Voir RB-03.
   - `NOT_FOUND` → ressource supprimée / ID obsolète. Vérifier avec l'user.
   - `INTERNAL_SERVER_ERROR` → bug backend. Stack trace logguée par
     `HttpExceptionFilter` → ouvrir un ticket avec le `REQ-ID`.

---

## RB-02 — `/health` retourne 503

**Symptôme** : Kubernetes ne route plus le trafic, ou le panneau
« Santé service » de `/admin/diagnostics` passe au rouge.

1. **Lire le détail** : `GET /api/v1/health` renvoie un JSON Terminus avec
   `info` (checks OK) et `error` (checks KO).
2. **Si `database: down`** :
   - Vérifier la DB managée (RDS / Cloud SQL / Postgres self-hosted).
   - Vérifier la var d'env `DATABASE_URL` dans la release courante.
   - Vérifier pool de connexions (erreur `too many clients already` ?
     → réduire `PRISMA_POOL_MAX` ou passer via PgBouncer).
3. **Si `storage: down`** : config MinIO incomplète. Vérifier
   `MINIO_ENDPOINT` + `MINIO_BUCKET`. Le check est volontairement léger
   (pas de ping réseau) pour éviter une dépendance critique.
4. **Escalade** : si la DB est KO >5 min, basculer en mode read-only
   (désactiver les endpoints d'écriture via feature flag) si la plateforme
   supporte cette bascule.

---

## RB-03 — Un seller se plaint de ne plus pouvoir publier (403)

**Symptôme** : `FORBIDDEN` sur `POST /marketplace/products` ou
`/marketplace/offers`.

1. **Vérifier le diagnostic memberships** :
   - `GET /admin/memberships/diagnostic` (ou ouvrir `/admin/diagnostics`).
   - Si l'utilisateur apparaît dans **« Sellers sans rattachement »** → il
     n'a pas de `UserCompanyMembership` : le rattacher via
     `/admin/memberships?prefillUserId=<userId>`.
2. **Vérifier son `sellerProfileIds`** : le token JWT doit contenir au
   moins un `sellerProfileId`. Forcer le user à se déconnecter/reconnecter
   après création d'une membership (les IDs sont résolus à la signature du
   JWT).
3. **Si le profil vendeur est en `SUSPENDED`** : le snapshot
   `/admin/diagnostics` → « Sellers suspendus » le remonte. Voir RB-05
   pour réintégrer.

---

## RB-04 — La file de revue (`PENDING`) explose

**Symptôme** : le panneau ops (`/health/ops` ou `/admin/diagnostics`)
affiche `review.pending` très élevé, ou l'admin page remonte des items
vieillis >7j dans « Risques & alertes ».

1. **Priorisation** : ouvrir `/admin` → section « Risques & alertes » qui
   liste les 10 items les plus anciens (triés par `createdAt` asc).
2. **Répartition** : vérifier si ADMIN/QUALITY_MANAGER sont absents
   (congés, bascule équipe) → réallouer la charge.
3. **Backpressure** : si le volume est structurel (nouvelle cohorte de
   sellers), envisager d'ouvrir temporairement la publication directe
   aux sellers `APPROVED` depuis > 6 mois (décision produit).

---

## RB-05 — Document seller expiré / rejeté

**Symptôme** : `documents.rejected > 0` ou document à `daysLeft < 30` dans
le panneau admin.

1. **Identifier** : `/admin` → « Risques & alertes » → onglet documents.
   Chaque item linké vers le seller concerné.
2. **Contacter le seller** via l'email inscrit sur le `SellerProfile`
   (template SUPPORT-002). Donner un délai explicite (J+14 pour upload
   renouvelé sinon suspension).
3. **Si dépassement** : passer le `SellerProfile` en `SUSPENDED` via
   `/admin/sellers/:id` — cela masque automatiquement ses
   `MarketplaceOffer` publiées (filtre côté catalogue buyer).
4. **Réintégration** : après upload + validation du document par
   `QUALITY_MANAGER`, repasser le profil en `APPROVED`.

---

## RB-06 — RFQ bloquée en `NEW` > 48h

**Symptôme** : un buyer remonte « personne ne me répond » ou l'admin voit
`rfq.newCount` qui stagne.

1. **Identifier** : `/quote-requests?status=NEW` (staff voit tout), trier
   par date asc.
2. **Vérifier l'assignation** : staff IOX (COORDINATOR) doit qualifier
   la RFQ et la passer en `QUALIFIED` pour déclencher la sollicitation
   des sellers matchés.
3. **Si le buyer n'a pas de réponse à `QUALIFIED` + 72h** : escalade
   manuelle vers 2-3 sellers APPROVED sur la catégorie concernée.
4. **Fin de vie** : si aucun seller ne peut répondre, passer en `CLOSED`
   avec un motif (→ template BUYER-003) ; ne pas laisser pourrir.

---

## Annexes

- **Diagnostics structure** : `/admin/diagnostics` (staff). Regroupe
  health, ops snapshot, memberships orphelines.
- **Métriques Prometheus** : `/api/v1/metrics` protégé par
  `METRICS_TOKEN` — voir `docs/OBSERVABILITY.md`.
- **Corrélation** : chaque requête porte un `x-request-id`. Propagé dans
  le body d'erreur (`requestId`) depuis v2.1. Logs préfixés
  `[<REQ-ID>]`.
