# IOX — Design System (DS-1)

_Langage visuel officiel IOX. Dérivé du dashboard Figma, généralisé à
l'ensemble de l'application. Cette page est la source de vérité ; Figma
sert de référence visuelle partielle et non normative._

## 1. Tokens — où les lire

| Token                          | Emplacement                               |
| ------------------------------ | ----------------------------------------- |
| Couleurs brand (tech-blue…)    | `apps/frontend/src/styles/globals.css` `:root` |
| Couleurs premium (DS-0)        | `--iox-premium-*` dans `globals.css`      |
| Gradients                      | `--gradient-iox-*` dans `globals.css`     |
| Shadows navy-tinted            | `--shadow-premium-{sm,md,lg,xl}`          |
| Motion                         | `--ease-premium`, `--duration-{fast,base,slow}` |
| Radii                          | `--radius` (8px), `--radius-xl` (16px), `--radius-2xl` (20px) |

Tailwind mapping : `bg-premium-primary`, `text-premium-accent`,
`shadow-premium-lg`, `bg-gradient-iox-primary`, `rounded-2xl`,
`ease-premium`, `duration-base`, etc. (voir `tailwind.config.ts`).

## 2. Palette officielle

**Primaire (navy)**
- `#0A1F4D` — `--iox-premium-primary` — surfaces sombres, CTA principaux,
  avatars, shell header accent.
- `#1A3A7D` — `--iox-premium-primary-light` — gradient du primaire.

**Accent (sky blue)**
- `#2D9CDB` — `--iox-premium-accent` — liens actifs, focus ring, KPI
  neutres, indicateur actif sidebar.
- `#5AB7E8` — light pour gradients.

**Sémantiques**
- Succès `#27AE60` / Warning `#F2994A` / Danger `#EB5757` / Neutre-50
  `#F8FAFC`.

**Statuts métier (conservés de V1)** — voir `tailwind.config.ts` >
`colors.status` pour `compliant / reserved / blocked / draft /
available`. Ne pas remplacer par les sémantiques : la lisibilité métier
prime.

## 3. Composants de base — tous dans `src/components/ui/`

| Composant       | Variants / notes |
| --------------- | ---------------- |
| `Card`          | `default / premium / glass / metric`. Default = premium. `metric` ajoute un halo accent radial. |
| `Button`        | `default / primary / accent / glass / outline / ghost / destructive / link` + sizes `sm / md / lg / icon`. Support `loading`, `leftIcon`, `rightIcon`, `asChild`. |
| `MetricCard`    | Card `metric` + animations Framer. Utiliser partout dans les dashboards (dashboard, seller, admin). |
| `Badge`         | Statuts métier. |
| `StatusBadge`   | Spécifique aux statuts de lots/décisions. |
| `Sheet`         | Drawer latéral (Radix). Utilisé pour la nav mobile et les filtres mobile. |
| `Dialog`        | Modales. |
| `EmptyState`    | États vides — toujours avec icône + titre + message court + CTA éventuel. |
| `ErrorState`    | Erreurs chargement — toujours avec retry. |

## 4. Patterns généralisés

### 4.1 Shell applicatif (`(dashboard)/layout.tsx`)

- Header sticky `bg-white/85 backdrop-blur-md`, logo gauche, alertes +
  profil droite.
- Sous `lg` (<1024px) : trigger hamburger ouvre un drawer latéral
  (`MobileSidebar`) qui contient `SidebarContent`.
- Desktop : `Sidebar` (`w-64`) en colonne fixe.
- Main : padding responsive `p-4 sm:p-6 lg:p-8`.

### 4.2 Navigation

- `SidebarContent` est partagé entre desktop (aside) et mobile (drawer).
- Sections regroupées par domaine métier, titres en `text-[10px]
  uppercase tracking-[0.12em] text-gray-400`.
- Item actif : `bg-premium-accent/10` + filet vertical gradient
  `bg-gradient-iox-accent`.
- Pied : carte profil + bouton déconnexion discret.

### 4.3 Page dashboard

- Grille KPI : `grid-cols-2 md:grid-cols-4 gap-4` sur mobile & desktop.
  Sur écrans très larges, grid-cols-4 reste optimal (la densité IOX est
  métier, pas marketing).
- Row pipeline distributions : `grid-cols-1 md:grid-cols-4` — sur
  mobile la KPI passe au-dessus, le pipeline en dessous (2×2).
- Header : `text-xl sm:text-2xl`, wrap flex pour "Actualiser" qui
  descend sur très petit écran.

### 4.4 Marketplace catalog

- Hero gradient navy→accent avec halos blur, padding `p-5 sm:p-8`.
- Filtres desktop : aside sticky 260–280px à gauche.
- Filtres mobile : trigger plein-largeur `MobileFiltersTrigger` au-dessus
  de la grille, Sheet left 88vw.
- Grille produits : `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`.

### 4.5 Login

- Fond `bg-gradient-to-br from-slate-50 via-white to-sky-50/50` avec
  deux halos blur accent/primary.
- Card blanche `rounded-2xl shadow-premium-lg` contenant :
  - brand moment (emblème + wordmark gradient)
  - form email/password avec icônes in-input
  - CTA primaire gradient + CTA secondaire "Explorer la Marketplace"
    outline
- Micro-badge conformité "Accès réservé" en bas.

## 5. Règles responsive

**Breakpoints Tailwind utilisés** : `sm=640`, `md=768`, `lg=1024`,
`xl=1280`, `2xl=1536`.

- **Navigation** : drawer sous `lg`, aside au-dessus.
- **Grilles KPI** : `grid-cols-2 md:grid-cols-4`. Jamais `col-span-3`
  sans responsive équivalent.
- **Tableaux** : toujours enrouler dans `<div className="overflow-x-auto
  -mx-4 sm:mx-0">` ou équivalent. La scroll horizontale sous-tableau
  est préférable à la fuite de layout.
- **Padding containers** : `p-4 sm:p-6 lg:p-8` pour les mains ; `p-5
  sm:p-6` pour les cards de contenu dense ; `p-4 sm:p-8` pour les hero
  sections.
- **Typographie** : `text-xl sm:text-2xl` pour H1 de page ; `text-2xl
  sm:text-3xl` pour H1 hero ; `text-sm` par défaut pour body.
- **CTA pleine largeur sous `sm`** : privilégier `w-full sm:w-auto` pour
  les boutons d'action primaires en mobile.
- **Filtres/formulaires** : wrap dans une Sheet sous `md` dès qu'ils
  dépassent 3-4 champs.

## 6. Ce qu'il ne faut PAS faire

- Ajouter des variants de couleurs ad hoc (`bg-[#...]`) — utiliser les
  tokens ou `status.*`.
- Dépasser 3 niveaux de nesting de cards.
- `col-span-X` sans correspondance mobile (`grid-cols-1 md:col-span-X`).
- Animer les tableaux de données (affecte les perfs + distrait).
- Utiliser `shadow-lg/xl` natif Tailwind : préférer `shadow-premium-*`
  (teintés navy, cohérents avec la marque).
- Casser la grille des KPI : `grid-cols-2 md:grid-cols-4` est le
  standard — le passage direct de 1 colonne à 4 est trop abrupt.

## 7. Prochaines étapes — harmonisation progressive

Les patterns ci-dessus sont appliqués sur : shell, dashboard principal,
marketplace catalog, login. À généraliser progressivement sur :

- Écrans de liste data (beneficiaries, products, inbound-batches, etc.)
  — wrapper tables dans `overflow-x-auto`, cards d'entête en
  `shadow-premium-sm`.
- Seller dashboard (`/seller/dashboard`) — déjà métric-cards-ready,
  alignement visuel avec dashboard principal.
- Admin (`/admin/*`) — reprendre le même shell, KPI cards homogènes.
- RFQ list/detail — hero compact, timeline verticale, status badges
  `StatusBadge`.
- Fiche produit marketplace (`/marketplace/products/[slug]`) —
  hero-gallery, sidebar vendeur sticky, panneau documents collapsible.

Chacune de ces harmonisations est **additive et sans risque** :
aucun contrat API modifié, aucun state métier déplacé.
