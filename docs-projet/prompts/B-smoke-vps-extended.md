# Prompt Claude Code — Smoke VPS étendu (FP-3, FP-2.1, FP-3.1, FP-6)

> **Usage** : à coller tel quel dans Claude Code. Lot très court (~30 min). Étend le script `smoke-authenticated.sh` existant pour couvrir les routes des 5 derniers lots, puis le lance contre le VPS de test.

---

## Contexte

5 lots ont été récemment mergés sur `main` (dernière HEAD : `00ac8aa`) : FP-3, FP-4, FP-2.1, FP-3.1, FP-6. Une investigation Chrome MCP partielle suggère que le déployé sur `https://iox.mycloud.yt` est **possiblement incohérent ou non à jour** :

- `/api/v1/marketplace/seller-profiles/me` → 401 (route FP-3 présente ✅)
- `/api/v1/marketplace/certifications?relatedType=...` → 404 "Cannot GET" (route FP-2 absente ❌)
- Frontend `buildId = pIHPGlHix0hzwpn-vqAJh` inchangé depuis la visite précédant les merges (frontend pas redéployé ❌)
- `/api/v1/marketplace/catalog?limit=5` → `total: 0` (pas d'offre publiée)

**Mission** : étendre le script `scripts/smoke-authenticated.sh` pour couvrir les routes ajoutées par les 5 lots récents, le lancer contre le VPS, et **rapporter sans masquer les écarts** (incohérence de déploiement vs code local).

## Pré-requis

- working tree clean
- branche courante : `main` (peut créer une branche `chore/smoke-extend-vps` si tu préfères, sinon commit direct sur main si l'utilisateur le permet — sinon en local sans commit)
- credentials de test disponibles (l'utilisateur les passera en variables d'environnement, **jamais en argument**)

## Mandat

### A. Lecture du script existant

Lire `scripts/smoke-authenticated.sh` pour comprendre :

- Le pattern `call_required` vs `call_optional`
- Comment l'auto-détection `HAS_LOT7` fonctionne (probe sur `/referentiel`)
- Le format de sortie (✔/✗/⚠ + couleurs)
- Comment les variables `BASE_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD` sont lues

### B. Extension ciblée (mode `call_optional` pour ne pas casser la baseline)

Ajouter une section "Lots récents (FP-3, FP-2.1, FP-3.1, FP-6)" qui teste les routes suivantes en `call_optional` :

#### Routes ouvertes au seller authentifié

- `GET /api/v1/marketplace/seller-profiles/me` (FP-3)
  - Attendu si seller : 200 avec JSON profil
  - Attendu si non-seller : 404 (NOT_FOUND : pas de profil rattaché) ou 401
- `PATCH /api/v1/marketplace/seller-profiles/me` avec body `{}` (FP-3)
  - Attendu : 200 (no-op) ou 400 si body vide refusé — accepter les deux
- `GET /api/v1/marketplace/certifications?relatedType=SELLER_PROFILE&relatedId=<UUID_VALIDE>` (FP-2 sous-jacent à FP-2.1)
  - Attendu : 200 avec liste (potentiellement vide)
  - Test critique : si 404 "Cannot GET", **module FP-2 PAS chargé sur le backend déployé** → écrire un message d'alerte spécifique et ne pas masquer ça en optional silencieux
- `GET /api/v1/marketplace/products?limit=5` (route auth mais utilisable par seller pour voir ses produits)
  - Attendu : 200 avec liste
- Vérifier qu'au moins un produit retourné contient les champs FP-6 (`originLocality`, `altitudeMeters`, `gpsLat`, `gpsLng`) **dans le schéma de réponse**, même si valeurs nulles

#### Routes publiques

- `GET /api/v1/marketplace/catalog?limit=5` (catalog public)
  - Attendu : 200 (déjà couvert peut-être, vérifier)
- `GET /api/v1/marketplace/catalog/products/<slug>` si au moins un produit publié existe
  - Vérifier que la réponse contient les clés FP-6 (`originLocality`, `altitudeMeters`, `gpsLat`, `gpsLng`)
- `GET /api/v1/marketplace/media-assets/<id>/url` (FP-3.1) avec un id média existant si possible
  - Attendu : 401 sans token, 200 avec token

#### Test de non-régression frontend

- `curl -sI https://iox.mycloud.yt/marketplace | grep -i x-nextjs-cache` (présence du header)
- `curl -s https://iox.mycloud.yt/marketplace/sellers | grep -c "Page introuvable"` → doit toujours retourner 1 (page MP-S-INDEX pas livrée → 404 attendu)

### C. Exécution

Lancer le script étendu contre le VPS :

```bash
BASE_URL=https://iox.mycloud.yt \
SMOKE_EMAIL=<email lu via prompt utilisateur, jamais codé> \
SMOKE_PASSWORD=<password lu via prompt utilisateur ou env var existante> \
./scripts/smoke-authenticated.sh
```

**Important** : ne JAMAIS hardcoder les credentials dans le script ou dans un commit. Si tu dois les manipuler, lis-les depuis les variables d'environnement uniquement.

### D. Rapport

Rendre la main avec un résumé concis :

```
✓ X / Y checks passants
✗ Z écarts détectés :
   - Route /api/v1/<...> → <statut HTTP> (attendu : <statut>)
   - ...
⚠ W warnings (call_optional 404, à analyser hors scope)
```

Et un diagnostic explicite si on détecte une **incohérence de déploiement** (par exemple : route FP-3 présente mais route FP-2 absente, ce qui ne devrait pas arriver si tout vient du même squash `c120870`).

## Règles absolues

- Aucune modification du code application en dehors de `scripts/smoke-authenticated.sh`.
- Aucun push, aucun merge.
- Aucun déploiement.
- Aucun hardcoding de credentials.
- En cas de doute sur l'analyse, **rapporter le brut** (le statut HTTP exact, le body de réponse) plutôt que de spéculer.

## Ce qu'on cherche à diagnostiquer

1. **Le frontend est-il à jour ?** (buildId vs ce qui est attendu). On a vu `pIHPGlHix0hzwpn-vqAJh`. Si c'est l'ancien build, le frontend n'a pas été redéployé.
2. **Le backend a-t-il les modules FP-2 / FP-3 / FP-2.1 / FP-3.1 / FP-6 chargés ?** L'absence de la route certifications est suspecte.
3. **Comment se déclenche le déploiement** ? Lire `deploy/vps/deploy.sh` et `.github/workflows/*` pour voir si auto-deploy ou manuel.

## Périmètre exclu

- Pas de fix du déploiement lui-même.
- Pas de modification de la config CI/CD.
- Pas de re-déploiement manuel.
- Juste constat + diagnostic.

## Rendre la main

Une fois fait, écrire un mini-rapport markdown dans `notes/smoke-vps-<date>.md` avec : checks exécutés, résultats bruts, écarts identifiés, hypothèses sur la cause (déploiement non déclenché, pipeline cassé, etc.).
