# IOX — FAQ Investisseurs

**Date :** 2026-05-10

> **Convention :** [CONSTRUIT] = validé et testé. [HYPOTHÈSE] = projection non validée commercialement.

---

## Produit

**Q : Le produit est-il vraiment fonctionnel ou juste une démo ?**

Fonctionnel. 1 003 tests automatisés backend, 0 failure, TSC clean. Le parcours complet RFQ → devis → WON → paiement Stripe Connect → facture PDF est validé de bout en bout. Démo live disponible. [CONSTRUIT]

---

**Q : Stripe Connect est-il intégré pour de vrais paiements ?**

L'intégration Stripe Connect est complète — split payment, `applicationFee`, `stripePaymentIntentId` — en mode test. Passage en mode live = configuration des clés Stripe prod + KYC vendeurs (~1 journée de déploiement). [CONSTRUIT côté code, à activer en prod]

---

**Q : Les données vendeurs et produits de la démo sont-elles réelles ?**

Non — les 9 vendeurs et 13 produits sont des fixtures fictives (préfixe `demo-`) basées sur des coopératives réelles de Mayotte. Les données de production (800 kg vanille/an, etc.) sont réalistes. La traction commerciale réelle sera communiquée séparément.

---

**Q : Le PDF de facture est-il généré en live ?**

Oui. `GET /api/v1/invoices/:id/pdf` renvoie HTTP 200 avec PDF généré à la demande. Service couvert par tests unitaires. [CONSTRUIT]

---

**Q : Quelle est la stack technique ?**

| Composant | Technologie |
|---|---|
| Backend | NestJS 10, TypeScript |
| ORM | Prisma (PostgreSQL) |
| Auth | JWT access/refresh |
| Paiements | Stripe Connect |
| Recherche | MeiliSearch |
| Cache / Queues | Redis / BullMQ |
| Stockage fichiers | MinIO (S3-compatible) |
| Frontend | Next.js |
| Tests | Jest (1 003 tests) |
| API docs | Swagger (186 endpoints) |

---

**Q : L'API est-elle documentée ?**

Oui. Swagger complet : `http://[host]/api/docs` — 186 chemins, 26 tags. [CONSTRUIT]

---

**Q : Combien de temps pour déployer en production ?**

Infrastructure : 1-2 semaines (VPS/Railway, domaine, SSL, emails transactionnels, Stripe live, RGPD). Le code est prêt.

---

## Business Model

**Q : Comment IOX se rémunère-t-il ?**

Commission de 5% sur chaque transaction, prélevée automatiquement via Stripe Connect. Exemple : acheteur paye 2 400 EUR → IOX reçoit 120 EUR → vendeur reçoit 2 280 EUR.

---

**Q : Le taux de 5% est-il configurable ?**

Oui. Le taux est paramétrable dans le runner (ligne de code). Peut varier par catégorie ou type de vendeur. [CONSTRUIT]

---

**Q : Quand est-ce que le modèle devient rentable ? [HYPOTHÈSE]**

Hypothèse de base : coûts fixes ~8 000 EUR/mois (équipe + infra). Avec une transaction moyenne de 2 000 EUR et une commission de 5% (100 EUR), il faut ~80 transactions/mois pour la rentabilité opérationnelle. [HYPOTHÈSE — non validé commercialement]

---

**Q : Y a-t-il d'autres sources de revenus prévues ? [HYPOTHÈSE]**

Oui, en feuille de route : abonnements vendeur premium (49–149 EUR/mois), certification assistée, API white-label pour institutionnels (chambres d'agriculture, collectivités). [HYPOTHÈSE]

---

## Marché

**Q : Pourquoi Mayotte ?**

1. 1er producteur mondial ylang-ylang (50-80% production mondiale)
2. DOM français — réglementation EU, accès Stripe, facturation conforme
3. Filière export sous-numérisée — peu de concurrence directe
4. Réseau de coopératives structurées, potentiellement réceptives

---

**Q : Quelle est la taille du marché ? [HYPOTHÈSE]**

À qualifier. Mayotte représente un premier terrain d'expérimentation. L'extension naturelle vers Réunion, Martinique, Guadeloupe (même modèle) démultiplierait le marché adressable. Données de marché à challenger lors du due diligence. [HYPOTHÈSE]

---

**Q : Quels sont les acheteurs cibles ?**

- Importateurs européens de produits alimentaires premium
- Cosmétique / parfumerie (ylang-ylang, vanille)
- Distributeurs bio et épiceries fines
- Grands groupes agroalimentaires (sourcing direct)

---

**Q : Qui sont vos concurrents ?**

Pas de concurrent direct identifié avec la combinaison : spécialisation Mayotte + conformité documentaire intégrée + paiement Stripe Connect + facturation auto. Les marketplaces agro généralistes (Faire, Ankorstore) ne ciblent pas ce segment. Les exportateurs traditionnels sont des intermédiaires humains.

---

## Équipe & Gouvernance

**Q : Quelle est la structure juridique ?**

[À compléter par l'équipe fondatrice]

---

**Q : Quelle est l'expérience de l'équipe dans le secteur ? [À compléter]**

[À compléter — expertise Mayotte, export agri, tech]

---

**Q : Y a-t-il des partenariats en cours ?**

[À compléter — coopératives, CCI Mayotte, collectivités, etc.]

---

## Investissement

**Q : Quel est le montant de la levée recherchée ? [HYPOTHÈSE]**

[À renseigner par l'équipe — montant, valorisation, type d'instrument]

---

**Q : Quel est l'use of funds ? [HYPOTHÈSE]**

Principalement : commercial/business dev (onboarding vendeurs, prospection acheteurs EU), tech (app mobile, notifs), marketing. Voir `deck-investisseur-iox.md` slide 11.

---

**Q : Quel est l'horizon de retour sur investissement ? [HYPOTHÈSE]**

[À renseigner selon la structure de l'investissement — equity, convertible, subvention]

---

**Q : Y a-t-il des aides publiques mobilisables ?**

Oui, potentiellement :
- BPI France (aide innovation, prêt d'amorçage)
- Fonds européens FEDER Mayotte
- Aide export COFACE / Bpifrance export
- Collectivité de Mayotte (numérique, agriculture)

[HYPOTHÈSE — à vérifier avec un conseil]

---

## Technique & Sécurité

**Q : Les données clients sont-elles sécurisées ?**

JWT access/refresh, Swagger désactivé en production, secrets hors dépôt Git (`.env`), webhooks Stripe signés HMAC. [CONSTRUIT]

---

**Q : L'architecture est-elle scalable ?**

Oui. Architecture NestJS modulaire, PostgreSQL, Redis, MeiliSearch — tous scalables horizontalement. Le throttling (rate limiting) est configuré. [CONSTRUIT]

---

**Q : Le code est-il propriétaire ? Y a-t-il des dépendances open source à risque ?**

Stack 100% open source standard (NestJS, Prisma, Next.js, etc.) — licences MIT / Apache 2.0. Stripe est une dépendance commerciale critique mais incontournable pour le paiement.

---

**Q : Peut-on voir le code source ?**

[Décision équipe — dépôt privé, accès sur NDA, ou open source]

---

*Voir aussi : `deck-investisseur-iox.md`, `business-model-iox.md`, `roadmap-produit-iox.md`*
