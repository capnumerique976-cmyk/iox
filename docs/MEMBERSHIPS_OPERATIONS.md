# Memberships — guide d'exploitation (V2 ownership)

## Contexte

La V2 du marketplace remplace un FK `User.companyId` (jamais matérialisé)
par une table de jonction `UserCompanyMembership` qui lie un user à 0..N
companies. Le périmètre marketplace (`sellerProfileIds`) d'un user est
résolu à la validation JWT via :

```
User → UserCompanyMembership[] → Company → SellerProfile?
```

Un `MARKETPLACE_SELLER` sans aucun membership est **neutralisé** :
`SellerOwnershipService` force son scope à vide (`{ sellerProfileId: { in: [] } }`),
donc zéro donnée exposée, zéro mutation possible, mais le login reste
fonctionnel (pour permettre à un admin d'assigner le membership a posteriori).

## Audit des données (au démarrage V2)

- `User` n'a **aucune** colonne qui lie directement à une company.
- `Company.email` n'est pas fiable et ne couvre pas la majorité des cas.
- **Aucun matching automatique user↔company n'est possible** : tous les
  rattachements doivent être explicitement validés par un humain.

## Préparer un CSV de backfill

Le script `prisma/backfill-memberships.ts` ne fait **aucune devinette** :
il lit un fichier CSV où chaque ligne est un rattachement déjà validé.

Format :

```csv
user_email,company_code,is_primary
alice@seller.fr,SELL-0001,true
bob@seller.fr,SELL-0001,
carole@consultant.fr,COOP-0002,
```

- Header **obligatoire**, ordre strict.
- `is_primary` : `true` / `false` / vide (vide = `false`). Un seul primary
  par user — le script bascule automatiquement les autres à `false`.
- Lignes commençant par `#` ou vides ignorées.
- Voir `prisma/backfill-memberships.csv.example`.

## Lancer le backfill

Dry-run (défaut) :

```bash
pnpm backfill:memberships -- --file prisma/backfill-memberships.csv
```

Appliquer vraiment :

```bash
pnpm backfill:memberships -- --file prisma/backfill-memberships.csv --apply
```

Logs de sortie par ligne :

- `CREATED` — nouveau membership créé (en mode apply uniquement).
- `ALREADY_EXISTS` — membership (userId, companyId) déjà présent, rien à faire.
- `PRIMARY_UPDATE_NEEDED` — existant, bascule primary à appliquer.
- `USER_NOT_FOUND` / `COMPANY_NOT_FOUND` — clé inconnue, ignoré.
- `WARN NON_SELLER_ROLE` — user avec rôle métier inattendu, rattachement
  quand même possible mais à vérifier (ex. BENEFICIARY, FUNDER).

Le script imprime un résumé final et sort `0` si dry-run ou tout-OK, `1` si
erreurs dures en mode apply.

## Onboarder un nouveau seller (procédure officielle)

1. **Créer le user** : `/admin/users` (rôle `MARKETPLACE_SELLER`).
2. **Créer la company** : `/companies` (avec les coordonnées marketplace).
3. **Créer le seller profile** : `/seller-profiles` lié à la company.
4. **Créer le membership** : UI admin `/admin/memberships` → bouton
   « Nouveau membership » → sélectionner user + company, cocher primary.

À l'issue de l'étape 4, le seller peut se reconnecter : son JWT résoudra
désormais le bon `sellerProfileIds`, le bandeau d'onboarding disparaît,
les actions marketplace redeviennent possibles.

## Vérifier qu'un seller est prêt

- Endpoint diagnostic : `GET /admin/memberships/diagnostic` →
  `{ totalSellerUsers, sellersWithMembership, sellersWithoutMembership, totalMemberships, membershipsWithoutSellerProfile }`.
- UI admin : bloc « Sellers sans rattachement » en haut de
  `/admin/memberships` (avec bouton « Rattacher » direct).
- Endpoint brut : `GET /admin/memberships/orphan-sellers`.
- Endpoint auxiliaire : `GET /admin/memberships/orphan-memberships` pour
  repérer les rattachements vers une Company sans SellerProfile (sans
  effet marketplace).

## Cas usuels

### Un user rattaché à plusieurs companies

Légitime : consultant, groupe multi-coopérative, compte mutualisé. Le
marketplace expose la **somme** des `sellerProfileIds` dérivés de tous
les memberships. Un seul peut être `primary` (défaut d'édition UX).

### Un seller existe sans match automatique

Toujours passer par l'UI admin ou un CSV explicite. Ne jamais deviner
l'entreprise depuis l'email ou le domaine : c'est la règle V2.

### Suppression d'un membership primary

Si le user possède d'autres memberships, le service auto-promeut le plus
ancien en primary et l'indique dans l'audit (`MEMBERSHIP_DELETED`,
`notes: "auto-promotion du membership <id> comme primary"`).

### Bandeau d'onboarding côté UI

Le dashboard seller affiche un bandeau orange si `/auth/me` renvoie
`needsSellerOnboarding: true`. Le frontend récupère ce flag à chaque
chargement — pas besoin de forcer un re-login après rattachement.

## Audit

Toutes les mutations membership sont tracées dans `audit_log` :

- `MEMBERSHIP_CREATED`
- `MEMBERSHIP_DELETED` (avec `autoPromotedMembershipId` en notes si appliqué)
- `MEMBERSHIP_PRIMARY_CHANGED`

`entityType = USER` (l'entité cible fonctionnelle est l'utilisateur dont
on change le périmètre ownership), `entityId = userId`. Les détails
membership/company apparaissent dans `newData` / `previousData` / `notes`.
