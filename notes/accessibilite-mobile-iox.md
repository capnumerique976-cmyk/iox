# Accessibilité & Mobile — Audit IOX

> Audit partiel d'accessibilité et de compatibilité mobile pour la phase pilote.  
> Référentiel : WCAG 2.1 niveau AA.  
> Date : 2026-05-11

---

## 1. Pages auditées

| Page | URL | Type d'audit |
|---|---|---|
| Connexion | `/login` | Revue manuelle |
| Marketplace (acheteur) | `/marketplace` | Revue manuelle |
| Tableau de bord vendeur | `/seller/dashboard` | Revue manuelle |
| Tableau de bord acheteur | `/buyer/dashboard` | Revue manuelle |
| Détail RFQ | `/rfq/[id]` | Revue manuelle |
| Checkout / Paiement | `/checkout` | Revue manuelle |
| CGU | `/legal/terms` | Revue manuelle |
| Politique de confidentialité | `/legal/privacy` | Revue manuelle |
| Mentions légales | `/legal/mentions-legales` | Revue manuelle |

---

## 2. Points positifs existants

### 2.1 Liens "Passer au contenu" (skip-to-content)
Les layouts principaux (marketplace layout, legal layout) incluent des liens `skip-to-content` permettant aux utilisateurs de clavier et de lecteurs d'écran de sauter la navigation répétitive. C'est une bonne pratique WCAG 2.4.1 (Contournement de blocs).

### 2.2 Icônes décoratives masquées
L'usage de `lucide-react` avec `aria-hidden="true"` sur les icônes purement décoratives est conforme à WCAG 1.1.1 (Contenu non textuel). Les icônes qui servent de boutons doivent avoir un label distinct (voir section 3).

### 2.3 Tableaux responsifs — `iox-table-wrap`
La classe CSS `iox-table-wrap` applique un défilement horizontal sur mobile (`overflow-x: auto`), ce qui évite le débordement de contenu sur les petits écrans. Conforme aux bonnes pratiques responsive.

### 2.4 Champs de formulaire pleine largeur
L'utilisation de `w-full` sur les `<input>` garantit que les champs de saisie utilisent toute la largeur disponible sur mobile, améliorant l'utilisabilité tactile.

### 2.5 Sidebar mobile — Navigation rétractable
La sidebar de navigation supporte un mode collapsed sur mobile. Les utilisateurs mobiles peuvent accéder à toute la navigation sans encombrer l'écran.

### 2.6 Labels sur les champs de formulaire
Les formulaires principaux (connexion, inscription, RFQ, profil) ont des `<label>` associés à leurs `<input>` via `htmlFor` / `id`, ce qui est conforme à WCAG 1.3.1 et bénéficie aux lecteurs d'écran.

---

## 3. Points d'amélioration identifiés

### 3.1 Boutons icône sans `aria-label`
Les boutons contenant uniquement une icône (ex. bouton "fermer", "éditer", "supprimer" représentés par une icône sans texte visible) peuvent manquer d'un attribut `aria-label` ou `aria-labelledby`.

**Impact** : les utilisateurs de lecteurs d'écran entendent "bouton" sans savoir ce que le bouton fait.

**Action** : ajouter `aria-label="Fermer"`, `aria-label="Modifier le produit"`, etc. sur tous les boutons icône.

```tsx
// Avant
<button><X className="h-4 w-4" /></button>

// Après
<button aria-label="Fermer"><X className="h-4 w-4" aria-hidden="true" /></button>
```

---

### 3.2 Contraste des couleurs — Thème sombre

Certains textes en `text-white/40` (opacité 40 %) sur fond sombre peuvent passer sous le ratio de contraste minimal de **4,5:1** requis par WCAG 1.4.3 pour le texte normal.

**Action** :
- Utiliser un outil de vérification de contraste (ex. WebAIM Contrast Checker).
- Remplacer `text-white/40` par `text-white/60` ou une couleur fixe avec contraste vérifié sur les textes importants (labels, messages d'erreur, placeholders).
- Les placeholders HTML sont exemptés (WCAG les considère comme décoratifs) mais doivent rester lisibles.

---

### 3.3 Focus visible — Styles Tailwind

Tailwind inclut des styles `focus:ring-*` qui améliorent la visibilité du focus clavier. Vérifier que ces styles ne sont pas désactivés globalement (ex. via `outline-none` sans alternative).

**Action** : rechercher `outline-none` dans le code et s'assurer qu'un style focus alternatif est toujours présent (`focus-visible:ring-2 focus-visible:ring-blue-500`).

---

### 3.4 Cibles tactiles — Taille minimale 44×44 px

Sur mobile, les cibles tactiles trop petites (< 44×44 px) causent des erreurs de tap. WCAG 2.5.5 (Success Criterion) recommande 44×44 px minimum.

**Éléments à vérifier** :
- Liens dans les tableaux (ex. "Voir le détail")
- Boutons icône dans la sidebar
- Badges cliquables

**Action** : ajouter `min-h-[44px] min-w-[44px]` ou `p-3` sur les éléments interactifs petits.

---

### 3.5 Messages d'erreur accessibles

Les erreurs de formulaire doivent être associées programmatiquement au champ concerné via `aria-describedby`.

**Action** :
```tsx
<input
  id="email"
  aria-describedby={errors.email ? "email-error" : undefined}
  aria-invalid={!!errors.email}
/>
{errors.email && <p id="email-error" role="alert">{errors.email.message}</p>}
```

---

## 4. Checklist WCAG 2.1 AA — Partielle

| # | Critère | Description | Statut |
|---|---|---|---|
| 1 | 1.1.1 Contenu non textuel | Icônes décoratives avec `aria-hidden` | OK |
| 2 | 1.3.1 Information et relations | Labels associés aux champs | OK |
| 3 | 1.4.3 Contraste (minimum) | Texte normal ≥ 4,5:1 | À vérifier |
| 4 | 1.4.4 Redimensionnement du texte | Texte lisible à 200 % zoom | OK (Tailwind rem-based) |
| 5 | 2.1.1 Clavier | Toutes les fonctions accessibles au clavier | À vérifier |
| 6 | 2.4.1 Contournement de blocs | Liens skip-to-content présents | OK |
| 7 | 2.4.3 Ordre du focus | Ordre de tabulation logique | À vérifier |
| 8 | 2.4.7 Focus visible | Focus clavier visible (ring Tailwind) | OK à vérifier |
| 9 | 3.3.1 Identification des erreurs | Erreurs de formulaire identifiées | À améliorer |
| 10 | 4.1.2 Nom, rôle, valeur | Boutons icône avec `aria-label` | À améliorer |

---

## 5. Test manuel recommandé

Avant le lancement pilote, effectuer un test rapide avec les outils natifs :

### Sur iOS (iPhone)
1. Activer VoiceOver : **Réglages > Accessibilité > VoiceOver > Activer**.
2. Naviguer sur `/login`, `/marketplace`, `/rfq/[id]`.
3. Vérifier que VoiceOver annonce correctement les boutons, champs et messages.
4. Tester la navigation avec le geste de balayage (swipe right/left).

### Sur Android (TalkBack)
1. Activer TalkBack : **Paramètres > Accessibilité > TalkBack**.
2. Même parcours que iOS.

### Sur desktop (clavier uniquement)
1. Désactiver la souris.
2. Naviguer avec `Tab`, `Shift+Tab`, `Enter`, `Espace`, `Échap`.
3. Vérifier que le focus est toujours visible et que toutes les actions sont réalisables.

### Outils de vérification automatique
- [axe DevTools](https://www.deque.com/axe/) (extension Chrome) — scan rapide de la page.
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) — vérification des couleurs.
- Lighthouse (Chrome DevTools) — onglet Accessibilité.

---

## 6. Post-pilote — Audit complet recommandé

Avant la mise en production publique :

- **Audit WCAG 2.1 AA complet** par un expert accessibilité ou un prestataire spécialisé.
- **Tests avec utilisateurs** ayant des besoins spécifiques (malvoyants, motricité réduite).
- **Déclaration d'accessibilité** (obligatoire pour les services publics et fortement recommandée pour le B2B).
- **Correction des points d'amélioration** identifiés dans ce document (priorité haute : aria-label, contraste, erreurs formulaire).
- **Mise en place d'une politique d'accessibilité** dans le processus de développement (revue accessibilité sur chaque PR).
