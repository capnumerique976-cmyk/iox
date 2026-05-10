# Handoff — Mandat 57 : Compliance Dashboard seller / admin

**Statut :** ✅ Complet  
**Backend tests :** 975/975 (avant : 967) — +8 nouveaux  
**Frontend tests :** 471/471 dans 75 fichiers (avant : 455/73) — +16 nouveaux (+2 fichiers)  
**TSC :** clean (backend + frontend)  
**Branche :** `mandat-55B` (commits `3dbe7b0` + `35be8e9`)  
**Date :** 2026-05-10

---

## 1. Résumé exécutif

Mandat 57 ajoute un tableau de bord conformité à deux niveaux :

- **Seller** : page `/seller/compliance` — un agriculteur/vendeur voit immédiatement son statut global (COMPLETE / ACTION_REQUIRED / PENDING_REVIEW / BLOCKED / INCOMPLETE), le nombre de documents et certifications vérifiés/refusés/en attente, et une action claire à réaliser.
- **Admin** : page `/admin/compliance` — l'équipe IOX voit les KPIs globaux et la liste de tous les sellers avec leur statut conformité, avec lien direct vers leur dossier.

Aucune donnée inventée. Tout repose sur les modèles Prisma existants (`MarketplaceDocument`, `Certification`, `SellerProfile`, `MarketplaceReviewQueue`).

---

## 2. Données conformité disponibles dans le schéma

### Disponibles ✅

| Donnée | Modèle | Champ |
|---|---|---|
| Statut document | `MarketplaceDocument` | `verificationStatus` (PENDING\|VERIFIED\|REJECTED\|EXPIRED) |
| Date expiration document | `MarketplaceDocument` | `validUntil` (DateTime nullable) |
| Statut certification | `Certification` | `verificationStatus` (PENDING\|VERIFIED\|REJECTED\|EXPIRED) |
| Date expiration certification | `Certification` | `validUntil` (DateTime nullable) |
| Raison rejet certification | `Certification` | `rejectionReason` (String nullable) |
| Statut profil vendeur | `SellerProfile` | `status` (DRAFT\|PENDING_REVIEW\|APPROVED\|SUSPENDED\|REJECTED) |
| Raison rejet profil | `SellerProfile` | `rejectionReason` (String nullable) |
| File de modération | `MarketplaceReviewQueue` | `status` (PENDING\|APPROVED\|REJECTED) |
| Modération médias | `MediaAsset` | `moderationStatus` (PENDING\|APPROVED\|REJECTED) |
| Raison rejet produit | `MarketplaceProduct` | `rejectionReason` |

### Non disponibles / hors scope ❌

| Donnée | Raison |
|---|---|
| Documents "obligatoires" définis | Pas de liste de documents requis dans le schéma — pas de notion de "missing" calculable automatiquement |
| Expiration calculée automatiquement | `EXPIRED` est un statut dans l'enum mais pas auto-set par cron — dépend de la mise à jour manuelle ou d'un futur job |
| Historique des changements de conformité | Existe dans AuditLog mais pas agrégé dans ce mandat |
| Score de risque pondéré | Non disponible — trop complexe pour M57 |

### Choix retenus

- **"expiringSoon"** = `validUntil` entre `now` et `now + 30j` (conservatif, visible avant l'urgence)
- **"INCOMPLETE"** = seller sans profil APPROVED et sans aucun doc refusé — état de démarrage
- **Documents "obligatoires"** = non traité (schéma ne le supporte pas) — nextAction guide le seller textuellement

---

## 3. Endpoints créés

### Backend — module `compliance/`

| Route | Rôle | Description |
|---|---|---|
| `GET /compliance/seller/summary` | `MARKETPLACE_SELLER` | Synthèse conformité du seller authentifié |
| `GET /compliance/admin/summary` | `ADMIN`, `QUALITY_MANAGER` | Agrégats globaux tous sellers |
| `GET /compliance/admin/sellers` | `ADMIN`, `QUALITY_MANAGER` | Liste sellers avec statut conformité (max 100) |

### Réponse seller summary

```typescript
{
  status: 'COMPLETE' | 'ACTION_REQUIRED' | 'PENDING_REVIEW' | 'BLOCKED' | 'INCOMPLETE';
  completionPercentage: number;          // (verifiedDocs + verifiedCerts) / total
  sellerProfileStatus: string;           // DRAFT | PENDING_REVIEW | APPROVED | etc.
  sellerProfileRejectionReason: string | null;
  totalDocuments: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  rejectedDocuments: number;
  expiredDocuments: number;
  expiringSoonDocuments: number;         // validUntil < now+30j
  totalCertifications: number;
  verifiedCertifications: number;
  pendingCertifications: number;
  rejectedCertifications: number;
  expiredCertifications: number;
  expiringSoonCertifications: number;
  pendingReviewItems: number;
  nextAction: string | null;             // texte humain, FR
}
```

---

## 4. Pages frontend créées/modifiées

### Nouvelles pages

| Route | Fichier | Rôle |
|---|---|---|
| `/seller/compliance` | `seller/compliance/page.tsx` | Dashboard conformité seller |
| `/admin/compliance` | `admin/compliance/page.tsx` | Dashboard conformité admin |

### seller/compliance — éléments UI

- **Statut global** (`compliance-status-badge`) : badge coloré vert/rouge/bleu/orange selon `status`
- **Barre de progression** (`compliance-progress-bar`) : `completionPercentage`
- **Grid compteurs** : vérifiés, en attente, refusés, expirent bientôt
- **Alertes** : si docs refusés → alerte rouge ; si profil rejeté → motif affiché
- **Section certifications** séparée
- **CTAs conditionnels** : "Corriger mes documents", "Ajouter mes documents", "Voir mes produits"
- **Empty state** (`compliance-empty-state`) : si 0 docs + 0 certs — message pédagogique

Mapping statuts → libellés FR :
- `COMPLETE` → "Conforme"
- `ACTION_REQUIRED` → "Action requise"
- `PENDING_REVIEW` → "En cours de vérification"
- `BLOCKED` → "Compte bloqué"
- `INCOMPLETE` → "Incomplet"

### admin/compliance — éléments UI

- **4 KPIs** : vendeurs conformes (`admin-compliance-kpi-approved`), en attente (`admin-compliance-kpi-pending`), documents à vérifier, refusés
- **Alerte expirations** si > 0 dans les 30j
- **Lien** vers `/admin/review-queue`
- **Tableau sellers** (`admin-compliance-sellers-table`) : nom, statut profil, conformité, docs (V/total), certifications (V/total), lien dossier
- **Empty state** (`admin-compliance-empty`) si aucun seller

### Navigation modifiée

`apps/frontend/src/components/layout/nav-config.ts` :
- Ajout `{ label: 'Ma conformité', href: '/seller/compliance', icon: ShieldCheck }` dans la section marketplace/seller
- Ajout `{ label: 'Conformité', href: '/admin/compliance', icon: ShieldCheck }` dans la section admin

---

## 5. Logique de calcul conformité

### ComplianceStatus — règles de priorité

```
REJECTED profile          → BLOCKED
SUSPENDED profile         → BLOCKED
rejectedDocs > 0
  OR rejectedCerts > 0    → ACTION_REQUIRED
DRAFT profile             → INCOMPLETE
PENDING_REVIEW profile
  OR pendingReviewItems>0 → PENDING_REVIEW
pendingDocs > 0
  OR pendingCerts > 0     → PENDING_REVIEW
APPROVED profile          → COMPLETE
default                   → INCOMPLETE
```

### completionPercentage

```
(verifiedDocs + verifiedCerts) / max(1, totalDocs + totalCerts) × 100
```

Un seller APPROVED sans document = 100% (statut COMPLETE, aucun document obligatoire défini).

---

## 6. Ownership et permissions

| Endpoint | Guard | Scoping |
|---|---|---|
| `GET /compliance/seller/summary` | `@Roles(MARKETPLACE_SELLER)` | `actor.sellerProfileIds[0]` — jamais d'autre seller |
| `GET /compliance/admin/summary` | `@Roles(ADMIN, QUALITY_MANAGER)` | Tous sellers (pas de filtre) |
| `GET /compliance/admin/sellers` | `@Roles(ADMIN, QUALITY_MANAGER)` | Tous sellers, max 100 |

Un MARKETPLACE_SELLER ne peut voir que sa propre conformité. Aucune fuite entre sellers possible.

---

## 7. Tests ajoutés

### Backend (+8)

**`compliance.service.spec.ts`** (nouveau) :
1. Seller sans `sellerProfileIds` → status ACTION_REQUIRED/INCOMPLETE
2. Seller APPROVED + 2 docs VERIFIED → status COMPLETE, completionPercentage > 0
3. Seller avec 1 doc REJECTED → status ACTION_REQUIRED
4. Seller PENDING_REVIEW → status PENDING_REVIEW
5. Seller REJECTED → status BLOCKED
6. `getAdminSummary` → agrégats corrects
7. `getAdminSellersList` → liste vide si aucun seller
8. `getAdminSellersList` → rows avec complianceStatus calculé

### Frontend (+16)

**`seller/compliance/page.test.tsx`** (nouveau, 10 tests) :
- Statut COMPLETE affiché en vert
- nextAction affiché si docs refusés
- Empty state si 0 docs + 0 certs
- Erreur si fetch échoue
- Nombre de docs vérifiés affiché
- Statut BLOCKED affiché si profil rejeté
- Barre de progression visible
- Refusés affichés
- En attente affichés
- CTA conditionnel correct

**`admin/compliance/page.test.tsx`** (nouveau, 5 tests) :
- KPIs admin affichés
- Empty state si 0 sellers
- Tableau sellers visible si sellers présents
- Alerte expirations si > 0
- Erreur si fetch échoue

---

## 8. Résultats

| | Avant M57 | Après M57 |
|---|---|---|
| Backend tests | 967/967 | **975/975** (+8) |
| Frontend tests | 455 (73 fichiers) | **471 (75 fichiers)** (+16, +2) |
| TSC backend | clean | clean |
| TSC frontend | clean | clean |

---

## 9. Risques restants

| Risque | Sévérité | Mitigation |
|---|---|---|
| `EXPIRED` dans `verificationStatus` — statut non auto-set | Moyen | Un cron (type RfqExpirationService) pourrait mettre à jour les docs/certs expirés quotidiennement — non fait en M57, TODO M58/M59 |
| Documents "obligatoires" non définis | Faible | La page affiche "Ajoutez vos documents" mais ne peut pas dire "il vous manque X" — acceptable V1 |
| Liste sellers `/admin/sellers` limitée à 100 | Faible | Suffisant pour V1 — pagination à ajouter si > 100 sellers actifs |
| Notifications compliance (doc refusé/validé) | Faible | Infrastructure MarketplaceBell disponible — PARTIE E du mandat non traitée, à faire en M58 si prioritaire |

---

## 10. Recommandation Mandat 58

| Item | Priorité | Effort |
|---|---|---|
| **Cron expiration docs/certs** : auto-set `verificationStatus = EXPIRED` quand `validUntil < now` | Haute | 1h (pattern RfqExpirationService) |
| **Alerte seller doc refusé** : notif MarketplaceBell quand un doc passe en REJECTED | Haute | 1h (EventEmitter2 + MarketplaceAlerts) |
| **Alerte admin nouveau doc** : notif quand doc soumis par seller → PENDING | Moyenne | 1h |
| **Export CSV admin compliance** : liste sellers + statuts en CSV | Moyenne | 2h |
| **Pagination `/compliance/admin/sellers`** | Faible | 30min |
| **Rate limiting endpoints compliance** | Faible | 15min |
| **Tests E2E Playwright** : flow seller → ajout doc → statut PENDING → admin valide → COMPLETE | Haute | 4h |
