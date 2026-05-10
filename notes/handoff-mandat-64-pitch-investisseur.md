# Handoff — Mandat 64 : Support commercial / Pitch investisseur-client IOX

**Date :** 2026-05-10  
**Statut :** ✅ LIVRÉ — 8 documents créés  
**Branche :** `mandat-55B`

---

## 1. Résumé exécutif

Création complète du kit commercial IOX pour présentation à investisseurs, clients et partenaires.  
8 documents produits dans `notes/`. Aucune modification du code applicatif.

---

## 2. Documents créés

| Fichier | Type | Contenu |
|---|---|---|
| `pitch-iox-30s-2min.md` | Pitchs courts | 30s / 1 min / 2 min, clair, crédible |
| `deck-investisseur-iox.md` | Deck 12 slides | Couverture → Problème → Solution → Produit → Demo → BizModel → Marché → Traction → Équipe → Concurrence → Use of Funds → CTA |
| `script-demo-commerciale-iox.md` | Script commercial | 15 min (standard) + 30 min (approfondie), objections communes |
| `business-model-iox.md` | Business model | Flux revenus, coûts, projections, unit economics, risques |
| `roadmap-produit-iox.md` | Roadmap | État construit [CONSTRUIT] + roadmap 0-3/3-12/12-36 mois [ROADMAP] |
| `faq-investisseurs-iox.md` | FAQ | 30 Q&R — produit, bizmodel, marché, équipe, investissement, technique |
| `fiche-synthese-iox.md` | Fiche une page | Synthèse exécutive — à imprimer ou envoyer par email |
| `handoff-mandat-64-pitch-investisseur.md` | Handoff | Ce document |

---

## 3. Conventions appliquées

| Marqueur | Signification |
|---|---|
| **[CONSTRUIT]** | Livré, testé, validé — M63 GO confirmé |
| **[HYPOTHÈSE]** | Projection non validée commercialement |
| **[ROADMAP]** | Prévu, non committé, non financé |
| **[À compléter]** | Information à renseigner par l'équipe fondatrice |

**Règle :** Aucune invention de chiffres de traction réels. Aucune promesse non vérifiable.

---

## 4. Données de référence utilisées (M63 validé)

| Fait | Valeur |
|---|---|
| Sellers demo | 9 APPROVED |
| Produits demo | 13 PUBLISHED |
| Tests backend | 1 003 / 1 003 |
| TSC | Clean |
| Endpoints Swagger | 186 |
| Parcours WON | rfq-ylang-extra-won → 2 400 EUR → Invoice ISSUED |
| Commission | 5% (120 EUR sur 2 400 EUR) |
| Backend port | 3001 |
| API prefix | /api/v1 |

---

## 5. À compléter par l'équipe

Les emplacements `[À compléter]` dans les documents :

| Document | Section | Information manquante |
|---|---|---|
| `pitch-iox-30s-2min.md` | Version 2 min | Montant levée, valorisation |
| `deck-investisseur-iox.md` | Slide 9 (Équipe) | Noms, profils, conseillers |
| `deck-investisseur-iox.md` | Slide 7 (Marché) | Taille marché, données export Mayotte |
| `deck-investisseur-iox.md` | Slide 11 (Use of Funds) | Montant, répartition réelle |
| `deck-investisseur-iox.md` | Slide 12 (CTA) | Email, tel, URL démo live |
| `faq-investisseurs-iox.md` | Équipe & Gouvernance | Structure juridique, expérience, partenariats |
| `fiche-synthese-iox.md` | Ce qu'on cherche | Montant, contact |
| Tous | Traction réelle | À ajouter quand premiers clients réels |

---

## 6. Architecture des documents

```
notes/
├── fiche-synthese-iox.md          ← 1 page, à envoyer en premier
├── deck-investisseur-iox.md       ← 12 slides, pitch complet
├── pitch-iox-30s-2min.md          ← Pitchs courts
├── script-demo-commerciale-iox.md ← Script demo client/commercial
├── business-model-iox.md          ← BizModel détaillé
├── roadmap-produit-iox.md         ← Roadmap produit
├── faq-investisseurs-iox.md       ← FAQ 30 Q&R
│
├── demo-script-investisseur-client.md  ← Script technique (M62)
├── demo-runbook-technique.md           ← Runbook démarrage (M62)
│
├── handoff-mandat-64-pitch-investisseur.md  ← Ce fichier
├── handoff-mandat-63-validation-demo-preprod.md
├── handoff-mandat-62-demo-packaging.md
└── handoff-mandat-61-smoke-tests-preprod.md
```

---

## 7. Séquence de présentation recommandée

### Pour un investisseur (premier contact)
1. Envoyer `fiche-synthese-iox.md` (1 page) par email
2. Appel 30 min : utiliser `pitch-iox-30s-2min.md` (version 2 min)
3. Réunion 1h : `deck-investisseur-iox.md` + démo live (script M62)
4. Due diligence : `faq-investisseurs-iox.md` + `roadmap-produit-iox.md` + `business-model-iox.md`

### Pour un client / acheteur
1. Démo directe : `script-demo-commerciale-iox.md` (15 min)
2. Suivi : `fiche-synthese-iox.md`

### Pour un partenaire technique
1. `fiche-synthese-iox.md`
2. `roadmap-produit-iox.md`
3. Démo API Swagger : `http://localhost:3001/api/docs`

---

## 8. Risques et limites des documents

| Risque | Mitigation |
|---|---|
| Projections financières non validées | Marquées [HYPOTHÈSE] partout, honnêteté explicite |
| Équipe non documentée | [À compléter] visible — à traiter avant présentation |
| Traction demo ≠ traction réelle | Distinction explicite dans tous les documents |
| Pitch deck en Markdown (pas PowerPoint) | Convertir avec Marp, Slidev ou Notion pour présentation visuelle |

---

## 9. Conversions format recommandées

Pour une présentation visuelle, convertir `deck-investisseur-iox.md` :
- **Marp** : `npx @marp-team/marp-cli deck-investisseur-iox.md -o deck.pdf`
- **Slidev** : copier le contenu dans un projet Slidev
- **Notion** : import direct du Markdown

---

## 10. Prochain mandat recommandé

**Mandat 65** (suggestions) :
- Option A : Commit + PR branche `mandat-55B` → `main` (cleanup complet, squash commits M57-M64)
- Option B : Conversion deck Markdown → présentation visuelle (Marp / Slidev)
- Option C : Onboarding premiers vendeurs réels (script d'onboarding assisté)
- Option D : Déploiement infrastructure production (Railway / VPS, Stripe live, RGPD)
- Option E : Compléter `@ApiResponse` sur 30 controllers secondaires + tests e2e
