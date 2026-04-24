# IOX — Assets de marque

Trois variantes du logo officiel **Indian Ocean Xchange** sont livrées ici
en SVG. Elles sont utilisées par le composant `Logo` (cf.
`src/components/brand/logo.tsx`).

| Fichier | Usage |
|---|---|
| `iox-logo.svg` | **Lockup horizontal** (emblème + wordmark). Pour headers marketplace public, topbar dashboard (desktop), login hero. Ratio ≈ 380×110. |
| `iox-emblem.svg` | **Emblème seul** (version couleur sur fond clair). Pour tiles compactes, avatar, variant `compact` du composant `Logo`. Ratio 1:1 (100×100). |
| `iox-emblem-on-dark.svg` | **Emblème seul** (version claire pour fonds sombres : gradient primary, hero dark, bannières navy). Ratio 1:1 (100×100). |

## Choix du format

SVG a été retenu plutôt que PNG pour :
- Scalabilité pixel-perfect (retina, impression).
- Poids minimal (~1.5 Ko par fichier vs plusieurs dizaines de Ko en PNG).
- Couleurs éditables (tokens `--iox-*` cohérents avec la palette app).
- Pas de variantes @1x/@2x/@3x à maintenir.

## Remplacement par un PNG officiel

Si un PNG officiel doit remplacer le SVG (branding corporate figé,
contrainte marketing), procéder ainsi :

1. Déposer le PNG ici sous le nom `iox-logo.png` (dimensions recommandées :
   1520×440 pour lockup, 400×400 pour emblème).
2. Adapter `src/components/brand/logo.tsx` : remplacer `.svg` par `.png` dans
   les `src` de `next/image`.
3. Ajouter les variantes retina (`iox-logo@2x.png`, `iox-logo@3x.png`) si
   affichage sur écran HiDPI critique.
4. Générer un favicon dédié (`favicon-32.png`, `favicon-192.png`,
   `apple-touch-icon.png` 180×180) via un outil type realfavicongenerator.net
   et les placer dans `apps/frontend/public/`.

## Contraintes actuelles (à peaufiner si besoin)

- **Favicon** : utilise pour l'instant `iox-emblem.svg` via
  `app/icon.tsx` (supporté Chrome/Firefox/Safari 16+). Pour compat IE/Legacy,
  générer un `favicon.ico` multi-tailles.
- **Open Graph** : aucun `og:image` n'est défini. À ajouter si le partage
  social de la marketplace devient un canal d'acquisition — exige un PNG
  1200×630 dédié.
- **Print** : SVG inline, OK pour impression vectorielle.
