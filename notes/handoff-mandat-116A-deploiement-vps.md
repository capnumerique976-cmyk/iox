# Handoff Mandat 116A — Déploiement VPS

**Date** : 2026-05-16  
**Commit déployé** : ccfe374  
**Domaine** : https://iox.mycloud.yt  
**Mode** : cohabitation (Telemante + Agora + Vavo intacts)

---

## Décision finale

✅ **GO M116B** — Déploiement réussi. Fixes sécurité vérifiés en production. Cohabitants intacts.

---

## Pré-déploiement audit

| Check | Résultat |
|-------|---------|
| Git local | clean, commit ccfe374 |
| `iox_backend` | Up 4 jours (healthy) |
| `iox_frontend` | Up 2h (healthy) |
| `iox_postgres/redis/minio/meilisearch` | tous healthy |
| Telemante (11 containers) | tous up |
| Agora (7 containers) | tous up |
| Vavo staging (2 containers) | up |
| Espace disque | 297 GB libres / 387 GB (23%) |

---

## Déploiement

### Étape 1 — Backend
```
./deploy/vps/deploy.sh backend
```
- Rsync : 1373 fichiers, 145 KB transférés
- Snapshot rollback : `iox-backend:prev` tagué
- Build : shared + prisma generate + tsc — succès
- Restart : `iox_backend` recréé
- Healthchecks : ✅ `/` 307, `/login` 200, `/api/v1/health` 200
- **Heure** : 2026-05-16T05:13:58Z

### Étape 2 — Frontend
```
./deploy/vps/deploy.sh frontend
```
- Rsync : 1373 fichiers (idempotent)
- Snapshot rollback : `iox-frontend:prev` tagué
- Build Next.js : 88 pages générées, `✓ Compiled successfully`
- Warnings non bloquants (ESLint) : `buyer/page.tsx` useMemo + `SearchSuggest.tsx` aria-controls
- Restart : `iox_frontend` recréé
- Healthchecks : ✅ `/` 307, `/login` 200, `/api/v1/health` 200
- **Heure** : 2026-05-16T05:16:03Z

---

## Vérification post-déploiement

### Containers IOX

| Container | Statut |
|-----------|--------|
| `iox_frontend` | Up 15s **(healthy)** ✅ |
| `iox_backend` | Up 2min **(healthy)** ✅ |
| `iox_postgres` | Up 4 jours (healthy) ✅ |
| `iox_redis` | Up 4 jours (healthy) ✅ |
| `iox_minio` | Up 4 jours (healthy) ✅ |
| `iox_meilisearch` | Up 4 jours (healthy) ✅ |

### Cohabitants — intacts

Telemante, Agora, Vavo : tous containers inchangés, aucun impact.

### Smoke tests fixes sécurité

| Endpoint | Code | Attendu | Fix vérifié |
|----------|------|---------|------------|
| `GET /api/v1/market-release-decisions` | **401** | 401 | ✅ B-001 actif |
| `GET /api/v1/documents` | **401** | 401 | ✅ B-002 actif |
| `GET /api/v1/health` | **200** | 200 | ✅ Backend OK |
| `/login` | **200** | 200 | ✅ |
| `/marketplace` | **200** | 200 | ✅ Catalogue OK |
| `/buyer/invoices/{uuid}` | **200** | 200 | ✅ B2 résolu |

---

## Rollback si besoin

```bash
# Backend uniquement
./deploy/vps/rollback.sh backend

# Frontend uniquement
./deploy/vps/rollback.sh frontend

# Ou manuellement sur VPS
ssh rahiss-vps "cd /opt/apps/iox && docker compose -f docker-compose.vps.yml up -d --no-deps backend"
```

---

## Warnings build (non bloquants)

1. `buyer/page.tsx:80` — objet `counts` invalide le `useMemo` → re-renders inutiles (cosmétique)
2. `SearchSuggest.tsx:164` — `role="combobox"` sans `aria-controls` → accessibilité WCAG (backlog)

Ces 2 warnings existaient avant M116A, non introduits par ce mandat.

---

## Résumé des fixes en production

| ID | Bug | En prod |
|----|-----|---------|
| B-001 | market-release-decisions sans guards | ✅ 401 vérifié |
| B-002 | documents KYC exposés | ✅ 401 vérifié |
| B-006 | compliance toujours COMPLETE | ✅ déployé |
| B-003/B-005 | user.sub → user.id audit trail | ✅ déployé |
| B-004 | incidents sans guards | ✅ déployé |
| B2 | buyer/invoices/[id] 404 | ✅ 200 vérifié |
| B3 | Stripe montant éditable | ✅ déployé |
| B4 | RFQ WON sans CTA paiement | ✅ déployé |
| F1-F4 | Navigation mobile tablette | ✅ déployé |
| F5 | Quote-requests/new 403 silencieux | ✅ déployé |

---

## Prochaine étape : M116B — Menu principal métier

GO confirmé. Déploiement stable. Passer au menu principal :  
Accueil / Référentiel / Production / Achats / Catalogue / Distribution / Administration.
