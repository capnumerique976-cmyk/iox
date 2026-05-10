# Note d'amélioration IOX — Audit et backlog priorisé

> Note synthétique d'audit produit + technique + UX, avec backlog d'améliorations classé par effort et impact. À lire en complément de l'étude paiement (`30-etude-paiement-en-ligne-marketplace.md`) et de la cartographie d'expert (`20-cartographie-expert.md`).

## 0. Résumé en 5 lignes

- IOX est sur une trajectoire saine : socle technique sérieux, marketplace publique fonctionnelle, gouvernance intacte, tests robustes.
- Trois axes structurants à durcir maintenant : **boucle seller (auto-édition encore incomplète)**, **richesse de la fiche produit (champs métier manquants)**, **expérience publique (annuaire seller absent, filtres faibles)**.
- Trois axes structurants à anticiper : **paiement en ligne** (cf. doc 30), **internationalisation et SEO** (la marketplace est en `noindex` et bilingue partiel), **observabilité métier** (KPIs financeurs et conversion non encore exposés).
- Pas de dette critique identifiée à ce stade ; quelques durcissements ciblés (bornes DTO, idempotence webhooks, alertes expiration certifs) à programmer.
- Recommandation : enchaîner **3 vagues d'amélioration** sur 3 trimestres, sans casser le rythme actuel des lots FP-x chirurgicaux.

## 1. Audit synthétique de l'existant

### 1.1 Forces actuelles

- **Architecture modulaire propre** (NestJS modules par domaine, schéma Prisma lisible et commenté, frontend Next.js App Router avec séparation seller/admin/public).
- **Conventions tenues** : conventional commits, migrations additives, controlled state cohérent partout, tests vitest et jest robustes (450 + 117).
- **Gouvernance marketplace réelle** : review queue, projection publique filtrée, RBAC, audit log, idempotence sur les mutations critiques.
- **Branding et identité claire** : "IOX — Indian Ocean Xchange", baseline B2B clairement assumée, hero homepage marketplace orienté valeur (traçabilité, conformité).
- **Documentation interne abondante et tenue** (`docs/marketplace/*`, `notes/handoff-*`, V1-CLOSURE-REPORT, V2-PROGRESS-REPORT, V2-ROADMAP-REPORT, etc.).
- **Lots de durcissement déjà passés** (Lot-9 : idempotence Idempotency-Key, refresh tokens révoqués, métriques auth, drills DR, confirmations destructives, notifications d'erreur centralisées).

### 1.2 Gaps identifiés (par catégorie)

#### Boucle seller (UX d'alimentation)

- ✅ FP-3 livré (auto-édition profil)
- ✅ FP-4 livré (saisie saisonnalité par seller)
- ❌ Édition certifications par seller (FP-2.1, en cours dans le mandat 6h)
- ❌ Upload de logo et bannière inline (FP-3.1, dans le mandat 6h)
- ❌ Création/édition d'une `MarketplaceOffer` côté seller — actuellement faisable seulement via admin
- ❌ Création/édition d'un `MarketplaceProduct` côté seller — idem
- ❌ Workflow "soumettre à review" depuis l'UI seller (visibilité du statut courant, des rejets, des corrections demandées)
- ❌ Notifications seller (email surtout) sur changement de statut, demande de correction admin, RFQ reçue, paiement reçu
- ❌ Gestion des médias galerie (upload multiple, ordre, drag-drop, suppression)
- ❌ Onboarding seller pas-à-pas (wizard) pour le premier seller qui se connecte sans rien

#### Fiche produit (richesse métier)

- ❌ Origine fine : `originLocality`, `altitude`, `gpsCoordinates` (FP-6, dans le mandat 6h)
- ❌ Volumes / capacités : `annualProductionCapacity`, `restockFrequency`, refacto `defaultUnit` (FP-5)
- ❌ Qualité structurée : `qualityAttributes[]` (enum ou table polymorphe), structuration `technicalSpecifications`
- ❌ Logistique structurée : `packagingFormats[]`, `temperatureRequirements`, `grossWeight`/`netWeight`/`palletization`
- ❌ Vidéo produit (le schéma supporte `MediaAssetType.VIDEO` mais aucun parcours d'upload/lecture)
- ❌ Analyses labo typées (actuellement `MarketplaceDocument` générique, pas de typage spécifique)

#### Expérience publique buyer

- ❌ Annuaire public des sellers (`/marketplace/sellers` retourne 404 — seulement `[slug]` existe)
- ❌ Filtres catalogue limités : pas de filtre par catégorie/sous-catégorie, par certification, par saisonnalité ("disponible en juin"), par incoterm, par origine fine
- ❌ Recherche full-text (`Recherche` côté UI marche par champ simple, pas de tokenisation pertinente)
- ❌ Comparateur de produits / favoris croisés
- ❌ Page "à propos" / "comment ça marche" pour rassurer un buyer non-initié
- ❌ Onboarding buyer (création de compte simplifié, demande de devis "guest" possible ?)
- ❌ Internationalisation effective EN (le toggle FR/EN existe en UI mais le contenu reste FR)

#### Observabilité et pilotage

- ❌ Tableau de bord financeurs / KPIs MCH (mentionné dans cahier des charges section 7.1, modules M12 — non implémenté)
- ❌ Métriques conversion marketplace (visites → vues fiche → RFQ → quote)
- ❌ Métriques SEO (page indexée ou non — actuellement en `noindex` partout)
- ❌ Alertes opérationnelles : certifs expirées, sellers inactifs, RFQ sans réponse > N jours

#### Sécurité et durcissement

- ⚠️ Bornes manquantes sur quelques arrays DTO (`languages`, `supportedIncoterms`, `destinationsServed`) — pas de `@ArrayMaxSize`, un seller pourrait pousser 10 000 codes
- ⚠️ Pas de rate-limiting visible côté API publique (catalog, RFQ création)
- ⚠️ Pas de Content Security Policy sur le frontend public
- ⚠️ Webhooks externes (paiement à venir) pas encore prévus dans le pattern Idempotency-Key existant

#### Performance

- ✅ Pages publiques : statiques rapides
- ⚠️ Catalog : pas de pagination cursor-based ni de cache CDN visible (à vérifier en détail si volume monte)
- ⚠️ Schéma Prisma : index présents sur les bons champs, mais pas d'analyse `EXPLAIN` formalisée pour les requêtes catalog avec multi-filtres

#### Mobile et PWA

- Mention dans le cahier des charges section 8.3 : "Application responsive et utilisable avec une connexion moyenne" (nota : Mayotte = connectivité parfois limitée).
- À vérifier : niveau de responsive du dashboard seller actuel, taille des bundles JS, usage offline-first via PWA pour les zones à connexion fragile.

## 2. Backlog d'améliorations priorisé

Notation : **I** = impact business / utilisateur (1 à 5) ; **E** = effort estimé (S/M/L/XL).

### 2.1 Quick wins (S, 0.5 à 1.5 jours d'effort, fort ROI)

| Lot      | Description                                                                                         | I   | E   |
| -------- | --------------------------------------------------------------------------------------------------- | --- | --- |
| **QW-1** | Activer `@ArrayMaxSize` sur tous les arrays DTO marketplace (durcir les bornes)                     | 3   | S   |
| **QW-2** | Page `/marketplace/sellers` (annuaire public sellers PUBLISHED) — résoudre le 404 actuel            | 4   | S   |
| **QW-3** | Lien "Voir ma vitrine publique" depuis le dashboard seller (déjà partiellement fait, à généraliser) | 3   | S   |
| **QW-4** | Métadonnées SEO sur fiches produit/seller publiques (Open Graph, Twitter Card)                      | 3   | S   |
| **QW-5** | Email transactionnel de notification de RFQ reçue côté seller                                       | 4   | S   |
| **QW-6** | Toggle FR/EN qui marche réellement (composant existe mais ne traduit pas)                           | 3   | M   |
| **QW-7** | Section "Comment ça marche IOX" sur la home publique (1 page statique)                              | 3   | S   |
| **QW-8** | Compteur de produits / sellers / pays sur la home publique (rassurer le visiteur)                   | 2   | S   |

### 2.2 Améliorations structurantes (M, 1 à 5 jours d'effort)

| Lot               | Description                                                                                        | I   | E   |
| ----------------- | -------------------------------------------------------------------------------------------------- | --- | --- |
| **FP-2.1**        | Édition certifications par seller (en cours dans le mandat 6h)                                     | 4   | M   |
| **FP-3.1**        | Uploader inline logo + bannière (en cours dans le mandat 6h)                                       | 4   | M   |
| **FP-5**          | Volumes / capacités : `annualProductionCapacity`, `restockFrequency` + refacto `defaultUnit`       | 4   | M   |
| **FP-6**          | Origine fine produit (`originLocality`, `altitude`, `gpsCoordinates`) (en cours dans le mandat 6h) | 3   | M   |
| **FP-7 candidat** | Qualité structurée : `qualityAttributes[]` (enum + projection publique)                            | 3   | M   |
| **FP-8 candidat** | Logistique structurée : `packagingFormats[]`, températures, poids                                  | 3   | M   |
| **MP-FILTERS-1**  | Filtres catalogue enrichis : catégorie, certification, saisonnalité (mois), incoterm               | 5   | M   |
| **MP-SEARCH-1**   | Recherche full-text propre (Postgres `tsvector` ou Meilisearch en V2)                              | 4   | M   |
| **MP-MEDIA-1**    | Galerie produit : upload multiple, ordre, suppression                                              | 4   | M   |
| **MP-NOTIF-1**    | Système de notifications email transactionnel (via Postmark/Mailjet/Resend)                        | 5   | M   |
| **MP-ALERT-1**    | Alertes seller : certif expirée, RFQ non répondue > N jours                                        | 4   | M   |
| **MP-ONBO-1**     | Wizard onboarding seller premier login (étape par étape)                                           | 4   | M   |

### 2.3 Lots structurants (L, 5 à 15 jours d'effort)

| Lot                  | Description                                                                                | I   | E   |
| -------------------- | ------------------------------------------------------------------------------------------ | --- | --- |
| **MP-OFFER-EDIT**    | Édition d'une `MarketplaceOffer` côté seller (création + modification + soumission review) | 5   | L   |
| **MP-PRODUCT-EDIT**  | Édition complète d'un `MarketplaceProduct` côté seller                                     | 5   | L   |
| **MP-I18N**          | Internationalisation effective FR/EN (next-intl ou next-i18next, contenus traduits)        | 4   | L   |
| **MP-VIDEO**         | Vidéo produit : upload, encodage léger, lecture côté public                                | 3   | L   |
| **MP-DASHBOARD-FIN** | Tableau de bord financeurs MCH (M12 du cahier des charges, KPIs MCH)                       | 5   | L   |
| **MP-METRICS-MKTP**  | Métriques marketplace (vues, RFQ, conversion) côté admin                                   | 4   | L   |
| **MP-CMS-1**         | Mini-CMS pour pages éditoriales (à propos, comment ça marche, blog, FAQ)                   | 3   | L   |
| **MP-PWA-1**         | PWA + offline minimal pour zones connexion fragile (Mayotte terrain)                       | 4   | L   |

### 2.4 Chantiers majeurs (XL, > 15 jours, multi-lots)

| Lot                          | Description                                                                                | I   | E   |
| ---------------------------- | ------------------------------------------------------------------------------------------ | --- | --- |
| **PAY-1**                    | **Paiement en ligne MVP** (Order + carte/SEPA + escrow + commission) — cf. doc 30          | 5   | XL  |
| **PAY-2**                    | Paiement V2 (SWIFT, BNPL B2B, gestion litiges)                                             | 4   | XL  |
| **MCH-V2**                   | Modules MCH V2 (CRM commercial, stocks/logistique, incidents, reporting financeurs avancé) | 5   | XL  |
| **MARKETPLACE-FAVORITES-V2** | Espace buyer authentifié riche (favoris, listes, RFQ historiques, suivi de commandes)      | 4   | XL  |

## 3. Vagues d'amélioration recommandées

### Vague 1 — Trimestre courant (4-6 semaines)

Stabiliser et compléter la boucle seller + enrichir la fiche produit. Tout cela est en chantier ou planifié.

- FP-2.1, FP-3.1, FP-6 (mandat 6h actuel)
- FP-5, FP-7, FP-8 (lots suivants)
- QW-1, QW-2, QW-3 (durcissement + correction du 404 sellers)

**Sortie attendue de la vague 1** : seller peut alimenter intégralement sa vitrine sans intervention admin, fiche produit conforme à la spec v2, marketplace publique sans bug visible.

### Vague 2 — Trimestre +1 (6-10 semaines)

Engager le paiement en ligne et préparer la V2 fonctionnelle.

- PAY-1 (Phases 0 à 3 de l'étude paiement)
- MP-NOTIF-1 (notifications email transactionnelles)
- MP-FILTERS-1 (filtres catalogue enrichis)
- QW-5, QW-6, QW-7 (notifications RFQ, i18n basique, page comment ça marche)

**Sortie attendue de la vague 2** : marketplace transactionnelle (paiement carte/SEPA + escrow + reversement seller), notifications opérationnelles, expérience publique nettement plus crédible pour un buyer.

### Vague 3 — Trimestre +2 (6-10 semaines)

Industrialiser le pilotage et préparer la croissance.

- MP-DASHBOARD-FIN (KPIs financeurs MCH, M12)
- MP-METRICS-MKTP (analytics marketplace)
- MP-SEARCH-1 (search full-text)
- MP-ONBO-1 (wizard onboarding seller)
- MP-OFFER-EDIT, MP-PRODUCT-EDIT (autonomie complète seller)

**Sortie attendue de la vague 3** : pilotage MCH visible, équipe IOX peut suivre business + technique, sellers entièrement autonomes.

## 4. Décisions à prendre avec toi

Avant d'engager les vagues, voici les **5 questions de cadrage produit** que je ne peux pas trancher :

1. **Ambition marketplace publique** : on cible un trafic mass-market (SEO, blog, page d'atterrissage par filière) ou on reste en B2B "club fermé" (sans SEO, accès via canaux sourcés) ?
2. **Multilingue** : EN obligatoire dès la vague 2, ou ça reste FR-first encore 6 mois ?
3. **Notifications** : email seul, ou email + SMS/WhatsApp dès la vague 2 ? (Cahier des charges mentionne SMS/WhatsApp en V2.)
4. **Paiement en ligne** : on engage la phase 0 (cadrage juridique + choix PSP) en parallèle du chantier MCH V2, ou on attend que MCH V2 soit livré ?
5. **Mobile / PWA** : on prévoit un effort dédié, ou on s'en tient au responsive web actuel ?

## 5. Ce qu'il ne faut pas faire à mon avis

- **Ne pas refondre.** Le socle est bon, les conventions sont tenues, les tests sont là. Tout ce qu'on ajoute s'ajoute en additif — c'est exactement la discipline en place et il faut la préserver.
- **Ne pas multiplier les PSP / outils tiers en parallèle.** Choisir un PSP marketplace, un outil mail, un outil métriques. Pas trois.
- **Ne pas céder à la tentation IA prématurée.** Le cahier des charges écarte explicitement l'IA avancée du MVP. Tenir la ligne tant que le socle métier n'est pas mature.
- **Ne pas ouvrir la marketplace publiquement (SEO indexable) tant que le contenu n'a pas atteint une masse critique.** Aujourd'hui `0 offre disponible` sur la home — c'est un signal négatif pour un visiteur qui découvre. Indexer quand on a 30+ offres minimum.

## 6. Conclusion

IOX a tout ce qu'il faut pour devenir une marketplace B2B de référence dans la zone océan Indien. Les fondations techniques sont saines, la gouvernance est claire, l'équipe a un rythme productif (Lot-9, FP-1 à FP-4 en quelques semaines).

Les trois priorités à mes yeux pour les 6 prochains mois :

1. **Finir la boucle seller** (FP-2.1 → FP-5/6/7/8) pour que les sellers alimentent eux-mêmes.
2. **Lancer le paiement en ligne** (PAY-1, cf. doc 30) — c'est le saut qui transforme la marketplace de "annuaire / RFQ" à "place de marché transactionnelle".
3. **Rendre la marketplace publique crédible pour un buyer** (annuaire sellers, filtres, notifications, EN) — sans ça, la transaction n'arrivera pas.

Le reste viendra naturellement.
