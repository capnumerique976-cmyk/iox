# Handoff — Mandat 53b (Solidité production : BullMQ + QuoteRequest FSM)

**Date** : 2026-05-09
**Branche** : working tree (pas encore commité)
**Objectif** : Fiabiliser les traitements asynchrones critiques et sécuriser les transitions métier des demandes de devis.

---

## Résumé des livraisons

| Partie | Statut | Description |
|--------|--------|-------------|
| A — Audit | ✅ | Architecture backend inventoriée : Redis déjà présent, BullMQ absent, FSM inline dans service |
| B — BullMQ | ✅ | Queue email + queue search, processors, services injectables, retries configurés |
| C — QuoteRequest FSM | ✅ | FSM centralisée extraite du service, transitions + règles rôles, guard paiement |
| D — EventEmitter2 + BullMQ | ✅ | SearchEventListener branché sur SearchQueueService (via QueueModule) |
| E — Observabilité | ✅ | Logs job enqueued/success/failed dans chaque processor et service |
| F — Tests | ✅ | +79 tests nouveaux (938/938), TSC clean |

---

## Diagnostic initial (Partie A)

| Aspect | État avant Mandat 53b |
|--------|----------------------|
| Redis | ✅ docker-compose port 6381, REDIS_URL dans .env.example, non utilisé |
| BullMQ | ❌ absent des dépendances |
| FSM RFQ | ⚠️ ALLOWED_TRANSITIONS hardcodé inline dans QuoteRequestsService |
| Email | ✅ NotifEmailService fire-and-forget, sans retry ni rejouabilité |
| EventEmitter2 | ✅ actif pour search (SearchEventListener → SearchIndexerService direct) |

---

## BullMQ (Partie B)

### Dépendances ajoutées

- bullmq 5.76.6
- @nestjs/bullmq 11.0.4

### Fichiers créés

| Fichier | Rôle |
|---------|------|
| src/queue/queue.constants.ts | QUEUE_NAMES, EMAIL_JOB_NAMES, SEARCH_JOB_NAMES |
| src/queue/jobs/email.job.ts | Type EmailJobPayload |
| src/queue/jobs/search.job.ts | Type SearchIndexJobPayload |
| src/queue/processors/email.processor.ts | Worker iox.email → NotifEmailService.send() |
| src/queue/processors/search.processor.ts | Worker iox.search → SearchIndexerService |
| src/queue/services/email-queue.service.ts | enqueue(payload) — push job + error swallow |
| src/queue/services/search-queue.service.ts | enqueueProduct/enqueueSeller — push + dedup par jobId |
| src/queue/queue.module.ts | BullModule.forRootAsync (Redis URL), 2 queues, SearchEventListener |

### Queues configurées

| Queue | Nom | Retry | Backoff | Dédup |
|-------|-----|-------|---------|-------|
| Email | iox.email | 3 attempts | exponential 2s | non |
| Search | iox.search | 3 attempts | exponential 1s | jobId stable <name>:<entityId> |

### Fallback sans Redis (tests)

QuoteRequestsService injecte @Optional() emailQueue?: EmailQueueService :
- Avec Redis (prod) → push BullMQ job
- Sans Redis (tests sans provider) → fallback direct NotifEmailService.send()

EmailQueueService.enqueue() et SearchQueueService.enqueue() catchent les erreurs Redis → user request jamais cassée.

---

## QuoteRequest FSM (Partie C)

### Fichier créé

src/quote-requests/quote-request-fsm.ts

### Transitions autorisées

| De | Vers |
|----|------|
| NEW | QUALIFIED, CANCELLED, LOST |
| QUALIFIED | QUOTED, CANCELLED, LOST |
| QUOTED | NEGOTIATING, WON, LOST, CANCELLED |
| NEGOTIATING | QUOTED, WON, LOST, CANCELLED |
| WON | *(terminal)* |
| LOST | *(terminal)* |
| CANCELLED | *(terminal)* |

### Règles rôles

- MARKETPLACE_BUYER : uniquement CANCELLED
- MARKETPLACE_SELLER : tout ; peut marquer WON/LOST
- ADMIN / COORDINATOR / QUALITY_MANAGER : toutes transitions

### Guards publics

- QuoteRequestFsm.assertTransition(from, to, actor) → BadRequestException ou ForbiddenException
- QuoteRequestFsm.assertPayable(status) → BadRequestException si status ≠ WON
- QuoteRequestFsm.canMessage(status, isInternalNote, actor) → bool

### Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| quote-requests/quote-requests.service.ts | ALLOWED_TRANSITIONS inline supprimé, FSM utilisée, @Optional() emailQueue injecté |
| quote-requests/quote-requests.module.ts | Import QueueModule |
| payments/payments.service.ts | QuoteRequestFsm.assertPayable() remplace condition inline |

---

## Intégration EventEmitter2 (Partie D)

### Flux avant

EventEmitter2 → SearchEventListener → SearchIndexerService (direct, sync)

### Flux après

EventEmitter2 → SearchEventListener → SearchQueueService → BullMQ iox.search → SearchProcessor → SearchIndexerService

### Déplacement SearchEventListener

Moved SearchModule → QueueModule (évite dép circulaire QueueModule ↔ SearchModule).

### Fallback Postgres

SearchIndexerService conserve le fallback Postgres si MeiliSearch absent. Inchangé.

---

## Tests (Partie F)

### Nouveaux fichiers

| Fichier | Tests |
|---------|-------|
| quote-requests/quote-request-fsm.spec.ts | 37 |
| queue/processors/email.processor.spec.ts | 4 |
| queue/processors/search.processor.spec.ts | 5 |
| queue/services/email-queue.service.spec.ts | 2 |
| queue/services/search-queue.service.spec.ts | 3 |

### Tests modifiés

| Fichier | Raison |
|---------|--------|
| search/search-event.listener.spec.ts | Listener injecte maintenant SearchQueueService |

### Résultats

- Backend : 938/938 ✅ (était 859/859 → +79)
- Frontend : 72/72 ✅ (inchangé)
- TSC backend : clean ✅
- TSC frontend : clean ✅

---

## Variables d'environnement

Aucune nouvelle variable. BullMQ utilise REDIS_URL (déjà dans .env.example).

---

## Risques restants (Mandat 54)

1. BullMQ Dashboard (Bull Board) : pas de UI monitoring queues
2. Dead Letter Queue : jobs échoués 3× pas alertés automatiquement
3. Email idempotence avancée : EmailLog permet détection doublon a posteriori
4. Statut EXPIRED RFQ : stale alerts visibles mais pas d'expiration auto (job cron à prévoir)
5. Realtime transitions : pas de WebSocket/SSE pour notifier le buyer en temps réel
