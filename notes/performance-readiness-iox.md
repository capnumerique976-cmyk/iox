# Performance — Readiness Pilote IOX

> Document de référence pour l'audit de performance avant le lancement du pilote terrain.  
> Phase ciblée : ~5 coopératives, ~10 acheteurs.  
> Date : 2026-05-11

---

## 1. Risques identifiés

### 1.1 MarketplaceBell — Polling HTTP

Le composant `MarketplaceBell` interroge le backend à intervalle régulier pour détecter de nouvelles notifications. Si l'intervalle est trop court (< 15 s), cela génère un trafic inutile même au repos.

**Risque** : saturation des connexions HTTP sur un VPS modeste si plusieurs utilisateurs sont connectés simultanément.

**Recommandation pilote** :
- Fixer l'intervalle de polling à **30 secondes minimum**.
- Envisager un en-tête `Cache-Control: no-store` côté backend pour éviter les réponses mises en cache.
- Post-pilote : remplacer le polling par Server-Sent Events (SSE) ou WebSocket.

---

### 1.2 Génération de factures PDF — Appel synchrone

La génération de PDF (factures acheteur/vendeur) peut être réalisée de manière synchrone dans la requête HTTP. Si la bibliothèque de rendu est lente ou si le document est volumineux (many line items), la requête peut dépasser 5–10 s et bloquer le thread Node.js.

**Risque** : timeout client, mauvaise expérience utilisateur, blocage du processus backend.

**Recommandation pilote** :
- Vérifier si la génération PDF est déjà déléguée à une queue BullMQ (`pdf-invoice` job ou similaire).
- Si elle est encore synchrone : déplacer la génération dans un worker BullMQ dédié et retourner un lien de téléchargement une fois le job terminé.
- Limiter la taille des factures pilote (pas de lignes excessives pendant la phase test).

---

### 1.3 MeiliSearch — Recherche produits

MeiliSearch est conçu pour des réponses < 50 ms même sur des index de plusieurs millions de documents.

**Risque** : faible pour la phase pilote (volume de données très limité).

**Action** : aucune action immédiate requise. Surveiller les temps de réponse via les logs applicatifs.

---

### 1.4 Images produits — Stockage MinIO

Les images produits sont stockées dans MinIO. Sans optimisation, chaque image est servie à sa résolution originale.

**Risques** :
- Images haute résolution non redimensionnées consommant de la bande passante.
- Absence de cache HTTP sur les assets statiques.

**Recommandations pilote** :
- Utiliser le composant `<Image>` de Next.js (optimisation automatique : WebP, resize).
- Si les images viennent d'une URL externe (MinIO sur VPS), configurer `remotePatterns` dans `next.config.js`.
- Activer les en-têtes `Cache-Control: public, max-age=31536000` sur MinIO pour les assets immuables.

---

### 1.5 Page Marketplace — Listing des offres

Une page listant toutes les offres sans pagination peut devenir lente dès que le catalogue grossit.

**Risque** : requête SQL sans LIMIT, rendu serveur long, grande payload JSON.

**Vérification** :
- Confirmer que la route API `/api/offers` implémente la pagination (`page`, `limit`, `cursor`).
- Confirmer que le composant UI affiche un état de chargement et ne charge pas toutes les pages à la fois.

**Recommandation pilote** : limiter à 20 offres par page, activer `cursor-based pagination` si possible.

---

### 1.6 Liste RFQ — Volume et pagination

Même risque que le listing offres : sans pagination, la liste des RFQ peut être lente si plusieurs acheteurs actifs génèrent des dizaines de demandes.

**Recommandation pilote** : pagination côté serveur (20 RFQ par page), filtres par statut activés.

---

## 2. Points OK — Pas d'action requise

| Élément | Statut | Note |
|---|---|---|
| Next.js App Router SSR | OK | Rendu serveur, chargement initial rapide |
| PWA manifest installable | OK | Ajouté en M77 |
| Tailwind CSS | OK | CSS tree-shaken, bundle minimal |
| BullMQ — jobs asynchrones | OK | rfq-reminder, email notifications, etc. |
| Redis — sessions et cache | OK | En place, rapide |
| NestJS — performances HTTP | OK | Fastify ou Express, adapté au pilote |
| PostgreSQL — requêtes critiques | OK à vérifier | Vérifier les index sur `users.email`, `rfqs.status`, `offers.seller_id` |

---

## 3. Recommandations pilote — Actions sûres

Ces actions peuvent être appliquées sans risque avant le lancement :

1. **Augmenter l'intervalle de polling MarketplaceBell** à 30 s minimum (modification d'une constante dans le composant).
2. **Vérifier la pagination** sur toutes les pages de listing : offres, RFQ, vendeurs, acheteurs (admin).
3. **Configurer Next.js Image** avec `remotePatterns` pour les images MinIO.
4. **Activer pm2 monit** sur le VPS pour surveiller CPU/RAM en temps réel.
5. **Vérifier les index PostgreSQL** sur les colonnes fréquemment filtrées.
6. **Tester la génération PDF** avec une facture réelle et mesurer le temps de réponse.

---

## 4. Métriques à surveiller pendant le pilote

| Métrique | Valeur acceptable | Action si dépassé |
|---|---|---|
| Temps de réponse API (p95) | < 500 ms | Profiler la route, vérifier les requêtes SQL |
| Temps de réponse page (TTFB) | < 1 200 ms | Vérifier SSR, réduire les appels API bloquants |
| Temps de génération PDF | < 5 s | Passer en async BullMQ |
| CPU backend (pm2) | < 70 % | Redémarrer, investiguer la cause |
| RAM backend (pm2) | < 400 MB | Vérifier les fuites mémoire (heap dump) |
| Temps de réponse MeiliSearch | < 100 ms | Réindexer, vérifier la config |
| Erreurs 5xx | 0 | Consulter `pm2 logs backend` immédiatement |
| Taille bundle JS frontend (gzip) | < 300 KB initial | Analyser avec `next build --analyze` |

---

## 5. Post-pilote — Optimisations planifiées

À réaliser **après** validation du pilote terrain, avant la mise en production publique :

- **Indexation PostgreSQL** : ajouter des index composites sur les colonnes de recherche et de tri les plus fréquentes (`(seller_id, status)`, `(created_at DESC)`, etc.).
- **Cache Redis** : mettre en cache les listes de produits et catégories (TTL 5–15 min).
- **CDN** : placer un CDN (Cloudflare) devant le VPS pour mettre en cache les assets statiques et compresser les réponses.
- **SSE / WebSocket** : remplacer le polling `MarketplaceBell` par une connexion persistante.
- **Génération PDF asynchrone** : si pas encore fait, déplacer dans BullMQ avec notification par email/notification.
- **Lazy loading images** : activer le `loading="lazy"` sur les images hors viewport.
- **Analyse bundle** : exécuter `ANALYZE=true next build` et éliminer les dépendances lourdes inutilisées.
- **Test de charge** : utiliser k6 ou Locust pour simuler 50 utilisateurs simultanés avant la production publique.
