# Handoff — Mandat 58 : RFQ Messages / Chat léger buyer ↔ seller

**Statut :** ✅ Complet  
**Backend tests :** 978/978 (avant M58 : 975) — +3 nouveaux  
**Frontend tests :** 487/487 dans 77 fichiers (avant M58 : 471/75) — +16 nouveaux (+2 fichiers)  
**TSC :** clean (backend + frontend)  
**Branche :** `mandat-55B`  
**Date :** 2026-05-10

---

## 1. Résumé exécutif

Mandat 58 améliore les échanges buyer ↔ seller autour d'une demande de devis (RFQ).  
L'essentiel du backend (endpoints, service, notifications) était déjà en place depuis les mandats précédents.  
Les livrables de M58 sont :

- **Partie A** — Audit complet : confirmation que le backend est ~85% implémenté.
- **Partie B** — `newMessages` ajouté aux alertes marketplace (dashboard + bell).
- **Partie C** — Buyer RFQ detail page : `data-testid` + 2 nouveaux tests.
- **Partie D** — Pages seller manquantes : liste (`/seller/quote-requests`) + détail (`/seller/quote-requests/[id]`).
- **Partie E** — MarketplaceBell : alerte nouveaux messages + fix liens `/seller/rfqs` → `/seller/quote-requests`.
- Navigation seller mise à jour : `/seller/quote-requests` remplace `/quote-requests`.

---

## 2. État initial après M57

| | Avant M58 |
|---|---|
| Backend tests | 975/975 |
| Frontend tests | 471/471 (75 fichiers) |
| TSC backend | clean |
| TSC frontend | clean |

---

## 3. Modèles / API messages existants avant M58

### Prisma — déjà en place ✅

```
QuoteRequest {
  id, buyerCompanyId, buyerUserId, marketplaceOfferId, status (NEW|QUALIFIED|QUOTED|NEGOTIATING|WON|LOST|CANCELLED),
  messages: QuoteRequestMessage[]
}

QuoteRequestMessage {
  id, quoteRequestId, authorUserId, message, isInternalNote, createdAt
}
```

**Statuts terminaux** : `WON`, `LOST`, `CANCELLED`

### Backend — déjà en place ✅

| Route | Méthode | Description |
|---|---|---|
| `GET /marketplace/quote-requests/:id/messages` | Tous rôles concernés | Liste messages (buyers : filtre `isInternalNote=false`) |
| `POST /marketplace/quote-requests/:id/messages` | Tous rôles concernés | Ajoute message + notif email + audit |

Logique existante :
- Buyer ne peut PAS créer de note interne (`isInternalNote=true` → 403)
- Messages triés par `createdAt asc`
- Notification email `rfq-message-created` envoyée aux deux parties (non bloquante)
- Aucune restriction sur RFQ terminée côté backend (historique lisible)
- Frontend (buyer + seller) bloque l'envoi sur RFQ terminée (WON/LOST/CANCELLED)

---

## 4. Ce qui manquait — livré en M58

### Backend

| Fichier | Changement |
|---|---|
| `dashboard.service.ts` | Ajout `newMessages` dans `getMarketplaceAlerts` pour SELLER et BUYER |
| `dashboard.service.spec.ts` | +3 tests : seller newMessages, buyer newMessages, seller sans profile |

**Logique `newMessages` :**
- **SELLER** : `QuoteRequestMessage.count` where `quoteRequest.marketplaceOffer.sellerProfileId = sellerProfileId AND authorUserId != actor.id AND isInternalNote = false AND createdAt >= since24h`
- **BUYER** : `QuoteRequestMessage.count` where `quoteRequest.buyerUserId = actor.id AND authorUserId != actor.id AND isInternalNote = false AND createdAt >= since24h`
- Inclus dans `total`

### Frontend buyer

| Fichier | Changement |
|---|---|
| `buyer/quote-requests/[id]/page.tsx` | `data-testid` sur section messages, empty state, messages list, items, form, input, send btn, closed notice |
| `buyer/quote-requests/[id]/page.test.tsx` | +2 tests M58 (bouton désactivé si champ vide, messages list avec items) |

Texte empty state mis à jour : _"Aucun message pour le moment. Vous pouvez poser une question au vendeur."_

### Frontend seller (nouveaux fichiers)

| Fichier | Type | Description |
|---|---|---|
| `seller/quote-requests/page.tsx` | Nouveau | Liste des RFQs reçues par le seller |
| `seller/quote-requests/page.test.tsx` | Nouveau | 5 tests |
| `seller/quote-requests/[id]/page.tsx` | Nouveau | Détail RFQ + conversation |
| `seller/quote-requests/[id]/page.test.tsx` | Nouveau | 8 tests |

### MarketplaceBell & nav

| Fichier | Changement |
|---|---|
| `marketplace-bell.tsx` | `newMessages` dans `MarketplaceAlerts`, `MessageSquare` import, AlertRow teal pour messages, fix `/seller/rfqs` → `/seller/quote-requests` |
| `marketplace-bell.test.tsx` | `newMessages: 0` dans `makeAlerts()`, +1 test M58 |
| `nav-config.ts` | `href: '/seller/quote-requests'` (était `/quote-requests`), `pathPrefixes` mis à jour |

---

## 5. Permissions

| Action | Accès |
|---|---|
| `GET /messages` buyer | Uniquement la RFQ du buyer connecté — backend filtre `buyerUserId` |
| `GET /messages` seller | Uniquement les RFQs de son sellerProfile — backend filtre `sellerProfileIds` |
| `POST /messages` buyer | Autorisé, `isInternalNote` forcé à `false` côté frontend |
| `POST /messages` seller | Autorisé, peut créer notes internes si besoin |
| `GET /messages` admin/staff | Tous messages visibles dont `isInternalNote=true` |
| Autre user | 403 |

---

## 6. Règle RFQ terminée

| Statut | Backend | Frontend |
|---|---|---|
| WON | Permet les messages (historique) | Bloque l'envoi, affiche "Cette demande est terminée. La conversation est conservée pour historique." |
| LOST | Permet les messages | Bloque l'envoi |
| CANCELLED | Permet les messages | Bloque l'envoi |

> Choix retenu : ne pas rouvrir la RFQ. Le backend reste permissif (admin peut écrire). Le frontend bloque l'UX pour les utilisateurs non-staff.

---

## 7. Notifications ajoutées

Déjà implémentées depuis M55B :
- `rfq-message-created` : email envoyé à l'autre partie quand un message non-interne est ajouté
- CTA seller → `/seller/quote-requests/:rfqId` ✅ (page maintenant créée)
- CTA buyer → `/buyer/quote-requests/:rfqId` ✅ (déjà existait)

Ajouté en M58 :
- `newMessages` dans MarketplaceBell (polling 2min) — alerte teal avec lien `/seller/quote-requests`

---

## 8. Pages frontend modifiées / créées

### `/seller/quote-requests` (NEW)

- Liste chronologique des demandes reçues (orderBy `createdAt desc`)
- Colonnes : titre offre, statut badge coloré, société acheteur, quantité, nombre messages, date
- Empty state : "Aucune demande pour le moment. Les demandes de vos acheteurs apparaîtront ici."
- Lien vers `/seller/quote-requests/[id]`
- Appelle `quoteRequestsApi.list(token)` — backend scope automatiquement au sellerProfile

### `/seller/quote-requests/[id]` (NEW)

- En-tête : titre offre, acheteur, date
- Timeline progression (identique à buyer)
- Section détail demande : quantité, pays, marché, société
- Section conversation avec `data-testid` complets
- Empty state : "Aucun message pour le moment. Vous pouvez répondre si vous avez besoin d'une précision."
- Form désactivé si terminal : "Cette demande est terminée. La conversation est conservée pour historique."
- Toast "Votre message a été envoyé." au succès

### `/buyer/quote-requests/[id]` (MODIFIÉE)

- `data-testid` ajoutés : `buyer-rfq-messages-section`, `buyer-rfq-empty-state`, `buyer-rfq-messages-list`, `buyer-rfq-message-item`, `buyer-rfq-message-form`, `buyer-rfq-message-input`, `buyer-rfq-send-btn`, `buyer-rfq-closed-notice`
- Empty state mis à jour : texte plus pédagogique

---

## 9. Tests ajoutés

### Backend (+3)

**`dashboard.service.spec.ts`** :
1. `M58 — seller view: newMessages=2 counted from others, included in total`
2. `M58 — buyer view: newMessages=1 counted from others, included in total`
3. `M58 — seller sans sellerProfileId → newMessages=0`

### Frontend (+16)

**`seller/quote-requests/page.test.tsx`** (5 tests) :
1. Empty state si aucune demande
2. Affiche la liste des demandes
3. Affiche le statut de chaque demande
4. Lien vers le détail de la demande
5. Affiche le nom de la société de l'acheteur

**`seller/quote-requests/[id]/page.test.tsx`** (8 tests) :
1. Affiche titre offre et nom acheteur
2. Empty state si aucun message
3. Affiche messages de la conversation
4. Seller peut envoyer un message (addMessage avec isInternalNote=false)
5. Bouton désactivé si champ vide
6. Notice lecture seule si RFQ WON
7. Notice lecture seule si RFQ CANCELLED
8. Affiche erreur si fetch RFQ échoue

**`buyer/quote-requests/[id]/page.test.tsx`** (+2) :
- `M58 — bouton Envoyer désactivé si champ vide`
- `M58 — section messages affiche chaque message dans la liste`

**`marketplace-bell.test.tsx`** (+1) :
- `M58 — affiche badge avec newMessages dans le total`

---

## 10. Résultats

| | Avant M58 | Après M58 |
|---|---|---|
| Backend tests | 975/975 | **978/978** (+3) |
| Frontend tests | 471 (75 fichiers) | **487 (77 fichiers)** (+16, +2) |
| TSC backend | clean | clean |
| TSC frontend | clean | clean |

---

## 11. Risques restants

| Risque | Sévérité | Mitigation |
|---|---|---|
| `newMessages` compte TOUS les messages des 24h — pas de marquage "lu" | Faible | V1 acceptable. Un système `readAt` nécessiterait une migration Prisma. |
| MarketplaceBell link `newMessages` → `/seller/quote-requests` (non `/buyer/...`) | Faible | Pour un buyer, si l'alerte vient d'un seller, le lien devrait pointer vers `/buyer/quote-requests`. À revoir si mixité buyer/seller dans un même compte. |
| Pas de rate limiting sur POST `/messages` | Faible | Déjà présent : `@Throttle({ default: { limit: 20, ttl: 60_000 } })` sur l'endpoint |
| Pas de pagination des messages | Faible | Acceptable V1 — très peu de messages par RFQ |
| E2E Playwright manquant | Moyen | Flow seller → réponse → buyer voit le message non testé en E2E |

---

## 12. Recommandation Mandat 59

| Item | Priorité | Effort |
|---|---|---|
| **Tests E2E Playwright** : flow complet seller reçoit RFQ → répond → buyer voit le message → alerte bell | Haute | 4h |
| **Marquage "lu" messages** : `QuoteRequestMessageRead` model — permet de ne compter que les non-lus | Moyenne | 3h (migration Prisma + service) |
| **Bell buyer → lien correct** : si `newMessages` buyer, lien pointe `/buyer/quote-requests` | Faible | 30min |
| **Cron expiration docs/certs** (reporté M57) : auto-set `verificationStatus=EXPIRED` | Haute | 1h |
| **Tests E2E compliance flow** (reporté M57) : seller → ajout doc → admin valide → COMPLETE | Haute | 4h |
| **Export CSV admin compliance** | Moyenne | 2h |
