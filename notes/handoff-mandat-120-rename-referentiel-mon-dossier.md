# Handoff — M120 : Renommer "Référentiel" en "Mon dossier"

**Date :** 2026-05-17
**Mandat :** M120 — Rename Référentiel → Mon dossier (menu mobile métier)
**Statut :** ✅ GO

---

## 1. Objectif

Remplacer le label visible "Référentiel" par "Mon dossier" dans le menu mobile métier IOX.
Décision UX : le terme "Référentiel" est trop technique pour les utilisateurs terrain.

---

## 2. Changements

### Règle appliquée

| Élément | Action |
|---------|--------|
| `id: 'referentiel'` | ✅ Conservé — id technique interne, logique `getBusinessModuleForPath` inchangée |
| `label: 'Référentiel'` | ✅ Remplacé par `'Mon dossier'` (×3 : seller, buyer, admin) |
| `description` | ✅ Uniformisée : `'Votre profil, vos documents et votre conformité.'` (×3) |
| Commentaire JSDoc | ✅ Mis à jour |
| `it()` descriptions tests | ✅ Mis à jour : `(Référentiel)` → `(Mon dossier)` |
| Assertions `.toBe('referentiel')` | ✅ Inchangées — testent l'id, pas le label |

### Menu mobile résultant

```
Accueil
Mon dossier        ← était "Référentiel"
Production
Achats
Catalogue
Distribution
Administration
```

---

## 3. Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `apps/frontend/src/components/layout/mobile-menu-config.ts` | 3 × `label` + 3 × `description` + commentaire JSDoc |
| `apps/frontend/src/components/layout/mobile-menu-config.test.ts` | `it()` descriptions uniquement |

## 4. Fichiers inchangés

| Fichier | Raison |
|---------|--------|
| `mobile-progressive-menu.tsx` | Rendu dynamique depuis `section.label` — pas de hardcode |
| `mobile-bottom-nav.tsx` | Idem, pas de label hardcodé |
| `nav-config.ts` | Desktop — hors scope M120 |

---

## 5. Tests

| Métrique | M117 | M120 | Delta |
|----------|------|------|-------|
| Tests mobile-menu-config | 122 | 122 | — |
| Tests échoués | 0 | 0 | — |

---

## 6. TypeScript

```
✅ 0 erreurs TypeScript
```

---

## 7. Décision

| Critère | Statut |
|---------|--------|
| Label visible | ✅ "Mon dossier" affiché dans le menu |
| Id interne | ✅ `'referentiel'` conservé — aucune régression logique |
| Description | ✅ Uniformisée ×3 rôles |
| Tests | ✅ 122/122 |
| TypeScript | ✅ 0 erreurs |
| Régression M117 | ✅ Aucune |

**→ GO** — Prêt pour déploiement M121.

---

## 8. Suite recommandée

- **M121** : Déploiement frontend M120 sur VPS
- **Futur** : Vérifier si "Référentiel" apparaît ailleurs (desktop `nav-config.ts`) et décider si renommage desktop aussi
