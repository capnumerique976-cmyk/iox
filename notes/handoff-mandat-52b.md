# Handoff — Mandat 52b (Refonte UX profonde)

**Date** : 2026-05-09
**Branche** : working tree (pas encore commité)
**Objectif** : Rendre IOX utilisable par agriculteurs, artisans, vendeurs et acheteurs non-tech

---

## Résumé des livraisons

| Partie | Statut | Description |
|--------|--------|-------------|
| 1 — Audit UX | ✅ | Audit terrain → 8 problèmes identifiés, tous corrigés |
| 2 — Architecture 3 niveaux | ✅ | `roles?: UserRole[]` sur NavSection + `getVisibleSections()` |
| 3 — Affichage conditionnel | ✅ | Sections filtrées par rôle dans top-nav et mobile-sidebar |
| 4 — Dashboard refonte | ✅ | Parcours guidé seller/buyer avec stepper visuel + CTA |
| 5 — Formulaires simplifiés | ✅ | Jargon éliminé, hints sur tous les champs, offre/produit/profil |
| 6 — Mobile-first | ✅ | Cards mobile + tables desktop (md:hidden/md:block), grids responsive |
| 7 — UX Copywriting | ✅ | ~70+ labels reecrits (seller + buyer), statuts traduits, empty states pedagogiques, jargon elimine |
| 8 — Implem technique | ⚡ Partiel | JourneyService + status-labels.ts. Product picker + country picker a venir |
| 9 — Tests | ✅ | 3 tests frontend mis à jour, 12 tests backend JourneyService |
| 10 — Livrables | ✅ | Ce document |

---

## Fichiers modifiés

### Backend (nouveaux)

| Fichier | Rôle |
|---------|------|
| `users/journey.service.ts` | Service parcours guidé (seller 6 étapes, buyer 5, staff 100%) |
| `users/journey.service.spec.ts` | 12 tests unitaires |

### Backend (modifiés)

| Fichier | Changement |
|---------|-----------|
| `users/users.controller.ts` | `GET /users/me/journey` avant route `:id` |
| `users/users.module.ts` | JourneyService ajouté aux providers |

### Frontend (nouveaux)

| Fichier | Rôle |
|---------|------|
| `hooks/use-user-journey.ts` | Hook fetch parcours + types miroir backend |
| `components/onboarding/journey-progress.tsx` | Stepper visuel (vertical mobile, horizontal desktop) |
| `components/onboarding/next-action-card.tsx` | Carte CTA "Prochaine étape" avec Sparkles |
| `components/onboarding/guided-dashboard-header.tsx` | Assemblage welcome + progress + CTA + sous-titres fermier |

### Frontend (modifiés)

| Fichier | Changement |
|---------|-----------|
| `layout/nav-config.ts` | `roles?: UserRole[]` + `getVisibleSections()` + `getDefaultLanding()` + 5 items marketplace + nav labels Phase 6 |
| `layout/top-nav.tsx` | Utilise `getVisibleSections(user.role)` |
| `layout/mobile-sidebar.tsx` | Idem |
| `contexts/auth.context.tsx` | `defaultLandingForRole()` + `safeRedirect(target, role)` |
| `seller/dashboard/page.tsx` | `<GuidedDashboardHeader />` intégré |
| `buyer/page.tsx` | Idem |
| `seller/profile/edit/page.tsx` | Labels déjargonnés (Incoterms→Conditions livraison, etc.) |
| `seller/marketplace-products/new/page.tsx` | Slug→Adresse web, UUID→Produit associé, hints humains |
| `seller/marketplace-products/page.tsx` | Empty state CTA + mobile cards + desktop table + slug "/" prefix + tooltip |
| `seller/marketplace-offers/page.tsx` | Empty state CTA + mobile cards + desktop table + subtitle |
| `seller/marketplace-offers/new/page.tsx` | Hints sur tous champs, MOQ→Commande minimum, placeholders |
| `seller/marketplace-offers/[id]/page.tsx` | Status traduits, labels déjargonnés |
| `seller/marketplace-products/[id]/page.tsx` | Status traduits via publicationStatusLabel() |
| `seller/marketplace-products/[id]/certifications/page.tsx` | Status traduits |
| `seller/marketplace-products/[id]/seasonality/page.tsx` | Status traduits |
| `seller/documents/page.tsx` | Refonte complète: empty state CTA, status traduits, back nav, DS-1 cards |
| `seller/invoices/page.tsx` | Empty state CTA, back nav, titre "Mes factures" |
| `seller/dashboard/page.tsx` | Status traduits (profil, RFQ, publication) |
| `products/new/page.tsx` | `grid-cols-1 sm:grid-cols-2` |
| `quote-requests/new/page.tsx` | Idem |
| `ui/pagination-controls.tsx` | Touch targets `px-4 py-2.5 text-sm` |
| `layout/seller-onboarding-banner.tsx` | Copywriting + lien support@iox.yt |
| `messages/fr.json` | ~17 clés i18n déjargonnées |

### Frontend (nouveaux — session 2)

| Fichier | Rôle |
|---------|------|
| `lib/status-labels.ts` | Maps de traduction partagées (publication, profil, RFQ) |
| `components/onboarding/journey-progress.test.tsx` | 6 tests stepper |
| `components/onboarding/next-action-card.test.tsx` | 5 tests CTA card |
| `components/onboarding/guided-dashboard-header.test.tsx` | 10 tests header guidé |

### Tests modifiés

| Fichier | Raison |
|---------|--------|
| `login/page.test.tsx` | Redirect MARKETPLACE_BUYER `/dashboard` → `/buyer` |
| `marketplace-products/new/page.test.tsx` | Validation message regex |
| `marketplace-products/page.test.tsx` | Empty state text + getAllByText (dual card/table) |
| `marketplace-products/[id]/page.test.tsx` | Status badge DRAFT→Brouillon, IN_REVIEW→En revue |
| `marketplace-offers/page.test.tsx` | Empty state text + getAllByText (dual card/table) |
| `invoices/page.test.tsx` | Empty state text |
| `layout/nav-config.test.ts` | +8 tests getVisibleSections + getDefaultLanding |

---

## Tableau des changements de copywriting

| Avant (jargon) | Après (humain) |
|----------------|----------------|
| MOQ | Commande minimum |
| Readiness export | Prêt à l'export |
| DLUO | Durée de conservation |
| Incoterm / Incoterms supportés | Conditions de livraison |
| Packaging | Emballage |
| Slug (URL publique) | Adresse web du produit |
| Code ISO recommandé | Ex : Mayotte, France, Madagascar |
| Identifiant Product MCH (UUID) | Produit associé (traçabilité) |
| Pays (ISO 2 lettres) | Pays + placeholder FR, MG, YT |
| Destinations servies | Pays où vous pouvez livrer |
| Délai moyen (jours) | Délai de livraison moyen |
| Capacités export | Livraison et langues |
| Codes courts | Ex : français, anglais, arabe |
| Aucun produit marketplace | Vous n'avez pas encore de produit |
| Contactez l'équipe IOX (passif) | Ajouter un produit (CTA actif) |
| Votre compte vendeur n'est pas encore rattaché | Votre espace vendeur est en cours de configuration |
| Cockpit vendeur marketplace | Mon espace vendeur |
| Ouvrir la file RFQ | Voir les demandes |
| Documents marketplace | Mes documents |
| Mes produits marketplace | Mes produits |
| Aucun produit marketplace | Aucun produit |
| Offre marketplace | Detail de votre offre |
| Nouvelle offre marketplace | Nouvelle offre |
| Nouveau produit marketplace | Nouveau produit |
| Identité minimale | Votre produit |
| Histoire / story | Votre histoire |
| Statut actuel : DRAFT | Statut : Brouillon |
| IN_REVIEW (dans texte) | En revue |
| verificationStatus brut | En attente / Verifie / Refuse / Expire |
| Code ISO recommandé (YT, FR) | Ex : Mayotte, France, Madagascar |
| DLUO/DLC | Duree de conservation |
| Slug : vanille | Adresse : vanille |
| **— Phase 4 buyer —** | |

| Devisée (statut RFQ) | Devis recu |
| Nouvelle (statut RFQ) | En attente |
| Qualifiée (statut RFQ) | En cours |
| Gagnée (statut RFQ) | Acceptee |
| Perdue (statut RFQ) | Non retenue |
| Annulée (statut RFQ) | Annulee |
| Aucune demande (empty state) | Guidance CTA vers catalogue |
| Table mobile non responsive | Cards mobile + table desktop (6 pages) |
| STATUS_GUIDE (manquant) | Bandeau contextuel par statut avec CTA |
| Paiement de votre commande | Payer votre commande |
| Réf. RFQ | N° demande |
| Offer ID (champ) | Identifiant de l'offre |
| MARKETPLACE_BUYER (rôle affiché) | Acheteur |
| Notifications RFQ | Alertes demandes de devis |
| Override les autres préférences | Remplace toutes les autres preferences |
| **— Phase 5 (audit final buyer) —** | |
| UUID brut offerId dans formulaire RFQ | Supprime — message contextuel a la place |
| `<code>offerId</code>` dans erreur | Message humain + CTA retour catalogue |
| Redirect /quote-requests/[id] (staff) | /buyer/quote-requests/[id] pour buyers |
| "Marché cible" (jargon) | "Destination des produits" + placeholder explicatif |
| "Société acheteuse" | "Votre entreprise" |
| Auto-select si une seule entreprise | Pré-sélection automatique |
| documentType brut (PHYTOSANITARY_CERT…) | Labels FR : Certificat phytosanitaire, etc. |
| **— Phase 6 (cohérence globale) —** | |
| "Devis recu" / "Negociation" / "Acceptee" / "Annulee" | Accents restaurés sur 3 fichiers buyer |
| "Cockpit acheteur" (nav label) | "Mon espace acheteur" |
| "Tableau Marketplace" (nav label) | "Vue d'ensemble" |
| "Documents marketplace" (nav label) | "Mes documents" (déjà corrigé Phase 5, synchronisé nav-config) |
| slug brut dans seller products list | "/" + title tooltip avec URL complète |

---

## Résultats des tests

- **Backend** : 859/859 ✅ (tsc clean)
- **Frontend** : 72/72 ✅ (446/446 tests — tous verts après Phases 4 + 5 + 6)

---

## Architecture du parcours guidé

```
[Backend]
JourneyService.getJourney(user: RequestUser)
  ├─ Seller: 6 étapes (profil, produit, publication, docs, devis, facturation)
  ├─ Buyer: 5 étapes (profil, catalogue, devis, offre, commande)
  └─ Staff: 100% (admin, coordinator, etc.)

GET /users/me/journey → { role, completionPercentage, nextAction, steps[], data }

[Frontend]
useUserJourney() → { journey, loading, error, refresh, isGuided }
  └─ GuidedDashboardHeader
       ├─ JourneyProgress (stepper visuel)
       └─ NextActionCard (CTA vers prochaine étape)
```

---

## Travail restant (futurs mandats)

1. **Wizard multi-step** pour le formulaire marketplace product edit (29 champs → 4 sections)
2. **Product picker** pour remplacer la saisie UUID manuelle dans création produit
3. **Country picker** avec autocomplétion au lieu de texte libre
4. **Notifications** visuelles (toast) pour actions réussies
5. **Checkout simplifié** : dejargonné en Phase 4, reste à pré-remplir montant + offerId depuis la RFQ (LOT 4)
6. **Mobile drawer** pour les filtres catalogue
7. **Tooltips / aide contextuelle** sur les champs complexes
8. **Audit accessibilité** WCAG (contrastes, focus, screen readers)
