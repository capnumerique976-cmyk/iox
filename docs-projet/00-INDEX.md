# Index des documents projet IOX

Ce dossier centralise les documents de référence projet pour qu'ils soient accessibles depuis le repo et utilisables par Claude Code et tout collaborateur.

## Documents historiques (programme MCH global)

- `01-cahier-des-charges-IOX-MCH-v1.md` — cadrage métier d'origine, plateforme MCH complète (M1 à M13).
- `02-etude-technique-IOX.md` — étude technique d'origine, stack et architecture cible.
- `03-specs-API-BDD-IOX.md` — contrat API et schéma BDD initial.
- `04-specs-detaillees-backlog-IOX.md` — écrans E01-E20 + user stories MVP/V2.
- `05-maquettes-fonctionnelles-IOX.md` — maquettes filaires low-fidelity.
- `06-recette-fonctionnelle-IOX.md` — cas de test MVP/V2 + scénarios métier.

## Documents marketplace (chantier en cours)

- `10-etude-technique-marketplace-IOX.md` — étude technique marketplace : architecture, modules, flux seller/admin/public, état d'avancement, roadmap FP-x.
- `11-fiche-produit-seller-v2.md` — référence fiche produit côté seller, avec ventilation public/admin.
- `12-fiche-produit-schema-json.json` — schéma JSON brut de la fiche produit v2 (référence pour DTO et formulaires).
- `13-contexte-canonique-marketplace.md` — **🔒 CONTEXTE CANONIQUE.** Bibliothèque à citer en tête de chaque prompt Claude Code et chaque revue de code marketplace. Toute autre formulation doit s'y aligner.

## Pilotage projet (vivant)

- `20-cartographie-expert.md` — synthèse Doc + Code + état des branches + mapping fiche v2 → schéma réel + lots faits/candidats. Document de pilotage à mettre à jour au fil des lots.

## Études stratégiques

- `30-etude-paiement-en-ligne-marketplace.md` — étude complète paiement en ligne marketplace : flux financiers, réglementation PSD2/KYB, comparatif PSP (Mangopay/Stripe/Lemonway/Adyen), schéma cible Prisma (`Order`, `Payment`, `Payout`, `MarketplaceFeeRule`, `SellerWallet`), roadmap 5 phases, 8 arbitrages à trancher.
- `31-note-amelioration-iox.md` — audit produit + technique + UX, backlog priorisé (quick wins / structurants / chantiers majeurs), 3 vagues d'amélioration recommandées, 5 questions de cadrage produit.
- `40-clarification-prochain-lot.md` — rapport de clarification post-merge des 5 lots, audit confirmé/incertain/runtime, comparatif des 5 chantiers candidats (FP-5/FP-7/FP-8/MP-S-INDEX/MP-EDIT-PRODUCT), recommandation priorisée, position sur PAY-1, prochain chantier détaillé.

## Prompts Claude Code

- `prompts/00-INDEX.md` — index des prompts prêts à coller.
- `prompts/01-push-pr-merge-fp3-fp4.md` — push + PR + merge des branches FP-3 et FP-4 dans l'ordre.
- `prompts/02-fp-2-1-seller-certifications-edition.md` — premier nouveau lot : édition certifications par seller.

## Convention

- Les documents historiques (00-09) cadrent le programme MCH dans son ensemble.
- Les documents marketplace (10-19) cadrent le sous-système marketplace IOX, en cours de développement par lots FP-x.
- Quand un document MCH d'origine entre en contradiction avec un document marketplace plus récent, **le document marketplace fait foi** pour le périmètre marketplace.
