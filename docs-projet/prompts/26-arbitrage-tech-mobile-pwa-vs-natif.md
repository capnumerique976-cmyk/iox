# Arbitrage tech app mobile IOX seller — PWA vs natif

> Mini-prompt + matrice de décision tech à coller dans une session pour trancher entre 4 options de stack mobile. Cible : démarrer le build après recherche utilisateur (cf trames 23/24/25).

---

## 0. Contexte

Stack web IOX existante :
- Next.js (App Router) + React + TypeScript
- Tailwind + shadcn-ui
- Vitest + Playwright
- Hosted sur VPS rahiss-vps via Docker

Cible mobile (cf brief 23) :
- Saïd (Android entry-level, 2 GB RAM, 3G fragile) → priorité absolue
- Maeva (médian) + Jean-Bruno (expert)
- Mayotte / Madagascar / Comores / Maurice / Réunion
- 95% Android, 5% iOS
- Offline-first obligatoire
- Photo + voix-first
- < 50 MB initial, < 200 MB total
- WCAG 2.1 AA

Équipe (à confirmer) :
- 1-2 devs front React/TypeScript
- 0 dev natif (Swift / Kotlin) actuel
- 0 dev Dart actuel
- Budget mobile build : à calibrer

---

## 1. Les 4 options techniques

### Option 1 — PWA Next.js pure

App = site web responsive + Service Worker + Web App Manifest.

**Stack** : Next.js (déjà là) + Workbox (Service Worker) + IndexedDB (offline) + manifest.json.

**Distribution** : URL classique → "Ajouter à l'écran d'accueil" depuis Chrome.

**Pros** :
- 0 nouvelle stack à apprendre
- Code 100% partagé avec web
- Déploiement instantané (push web → tous users)
- 0 store review (pas Play / pas App Store)
- Coût dev minimal

**Cons** :
- Pas de Push notifications iOS Safari < iOS 16.4 (mais OK Android)
- Caméra HTML5 `getUserMedia` correct mais pas aussi natif (pas de filtres OS)
- Background sync limité
- Friction installation : Saïd ne sait pas "ajouter à l'écran d'accueil"
- Pas dans Play Store = pas de découverte naturelle pour user
- Permissions OS limitées (pas accès contacts, biométrie patchy)
- Performance perçue inférieure sur Android low-end

### Option 2 — Capacitor + Next.js

PWA wrappée dans coquille native via Capacitor (Ionic). Build APK + IPA depuis codebase web.

**Stack** : Next.js (export static) + Capacitor + plugins Capacitor (Camera, Geolocation, Push, Storage).

**Distribution** : APK direct (sideload) + Play Store + App Store.

**Pros** :
- Code 95% partagé avec web
- Accès APIs natives via plugins (caméra, push, storage, biométrie)
- Build APK installable Play Store ou direct
- Migration progressive depuis PWA
- Équipe React peut produire sans apprendre stack natif
- Hot reload web pendant dev

**Cons** :
- Build APK + IPA = 2 pipelines (Gradle + Xcode)
- Plugins parfois en retard sur APIs natives récentes
- Performance bonne mais pas équivalente natif pur
- Bridge JS ↔ natif = surcoût mémoire (problème sur 2GB RAM ?)
- Bundle JS toujours présent → < 50 MB initial difficile

### Option 3 — React Native + Expo

App natif compilé depuis JS via React Native. Expo gère build + OTA + plugins.

**Stack** : React Native + Expo SDK + EAS Build + Expo Router + TanStack Query.

**Distribution** : APK + IPA via Expo EAS Build, Play Store + App Store.

**Pros** :
- Performance natif réelle (pas de WebView)
- Communauté énorme + écosystème mature
- Expo simplifie build + distribution + OTA updates
- React mental model conservé
- APIs natives complètes via Expo modules
- Bundle final ~ 25-40 MB
- Push notifications + background tasks robustes

**Cons** :
- Stack nouvelle (React Native ≠ React DOM exactement)
- Code partagé avec web limité (~30-40% maximum, surtout logique métier)
- Composants UI à recréer (pas de Tailwind direct, NativeWind possible mais limité)
- Bridge React Native parfois fragile
- Onboarding équipe : 2-4 semaines avant productivité réelle
- Coût build infrastructure Expo (gratuit jusqu'à un seuil)

### Option 4 — Flutter

App natif compilé depuis Dart. UI rendu via Skia.

**Stack** : Flutter SDK + Dart + Riverpod/Bloc + Drift (sqlite).

**Distribution** : APK + IPA.

**Pros** :
- Perfs au top, 60 fps stable même sur low-end
- UI ultra-customisable, look identique iOS/Android
- Hot reload excellent
- Bundle 15-25 MB
- Ecosystème mûr (Google backed)

**Cons** :
- **Dart** = langage à apprendre (0 ROI sur stack existante)
- 0 partage code avec web Next.js
- Équipe React = 4-8 semaines onboarding
- Communauté plus petite que React Native
- Recrutement Dart difficile

---

## 2. Critères d'arbitrage (pondérés)

| # | Critère | Poids |
|---|---|---|
| 1 | Coût dev V1 (équipe actuelle) | 25 |
| 2 | Performance Saïd (Android entry-level 2GB) | 20 |
| 3 | Capacités natives (caméra, voice, push, biométrie) | 15 |
| 4 | Réutilisation code web existant | 10 |
| 5 | Distribution (Play Store + sideload APK) | 10 |
| 6 | Maintenance long-terme | 10 |
| 7 | Onboarding équipe | 5 |
| 8 | Roadmap iOS V2 | 5 |
| **Total** | | **100** |

---

## 3. Matrice scoring (1-5)

| Critère | Poids | PWA | Capacitor | RN+Expo | Flutter |
|---|---|---|---|---|---|
| 1. Coût dev V1 | 25 | 5 | 4 | 3 | 2 |
| 2. Perf Saïd Android low | 20 | 2 | 3 | 4 | 5 |
| 3. Capacités natives | 15 | 2 | 4 | 5 | 5 |
| 4. Réuse code web | 10 | 5 | 5 | 2 | 1 |
| 5. Distribution | 10 | 2 | 5 | 5 | 5 |
| 6. Maintenance | 10 | 4 | 4 | 3 | 3 |
| 7. Onboarding équipe | 5 | 5 | 4 | 2 | 1 |
| 8. iOS V2 | 5 | 3 | 5 | 5 | 5 |
| **Score pondéré** | | **315** | **400** | **365** | **335** |

---

## 4. Verdict

**Capacitor + Next.js gagne** (score 400/500).

Raisons :
- Coût dev V1 minimal (équipe React produit sans nouvelle stack)
- Capacités natives suffisantes pour V1 (caméra, push, storage offline, biométrie via plugins Capacitor)
- Distribution Play Store + sideload APK couvre les 2 modes (Saïd via agent MCH = APK direct, Maeva = Play Store)
- Migration progressive depuis PWA si besoin
- Code partagé ~95% avec web → roadmap maintenue alignée

**RN+Expo proche** (365). À considérer si :
- Saïd a vraiment problème de perf en V1 PWA-Capacitor (à mesurer après bêta)
- Roadmap V2 nécessite features avancées pas couvertes par plugins Capacitor (AR, ML on-device, etc.)
- Recrutement RN spécialiste possible

**Flutter recalé** (335) : excellent tech mais ROI nul sur stack existante. Pertinent uniquement si équipe pivote vers Dart globalement.

**PWA pure recalée** (315) : friction install + capacités limitées. Pertinent comme **prototype rapide V0** avant Capacitor.

---

## 5. Roadmap implémentation Capacitor

### V0 — Prototype PWA (1-2 semaines)

But : valider les 6 parcours (cf brief 23) avant build natif.

- Routes Next.js dédiées `/app/*` mobile-only (route group + layout dédié)
- Service Worker basique (Workbox)
- Manifest.json + icônes
- Testing en présentiel sur smartphones cibles
- 0 build natif à ce stade

### V1 — Capacitor wrap (3-4 semaines)

- Setup Capacitor sur le projet Next.js (export static activé pour les routes `/app/*`)
- Plugins core : Camera, Filesystem, Network, Storage, Push Notifications, Biometric Auth
- Build script EAS-like via `cap build android`
- APK signé + premier sideload sur smartphone Saïd
- Push notif via FCM (Firebase) ou OneSignal
- Sync offline → IndexedDB côté web + sync background côté natif

### V2 — Distribution Play Store (1 semaine)

- Compte Google Play Console (25 USD one-shot)
- Asset Store (icônes, screenshots, description FR)
- Closed alpha avec sellers MCH
- Open beta après validation
- Production rollout progressif

### V3 — iOS si demande

- Build Capacitor iOS (Xcode + compte Apple Developer 99 USD/an)
- Adaptations design système (HIG iOS)
- TestFlight beta
- App Store rollout

---

## 6. Questions à trancher avant build

À répondre avant V1 :

1. **Hébergement assets statiques natifs** : self-hosted VPS ou CDN dédié (CloudFront / Bunny.net) ?
2. **Push notifications provider** : Firebase Cloud Messaging (gratuit, Google data) ou OneSignal (gratuit jusqu'à 10k users) ?
3. **Crash reporting** : Sentry (déjà sur web ?) ou alternative ?
4. **OTA updates** : Capacitor Live Updates (Ionic Cloud paid) ou rebuild + push Store ?
5. **Mode dev / prod** : env vars séparés mobile vs web ? Comment ?
6. **Nom app** dans Play Store : "IOX" ? "IOX Marketplace" ? "IOX Producteur" ?
7. **Bundle ID** : `yt.mycloud.iox` ? `com.iox.seller` ?
8. **Signing keys Android** : generate + store en CI ? Qui détient ?
9. **Compte Google Play Developer** : nom IOX SAS ou MCH ?
10. **TVA + facturation in-app** : pertinent V1 ? (probable non).

---

## 7. Coût estimatif V1 Capacitor

| Poste | Coût |
|---|---|
| Dev front (1 dev × 4 sem) | 8-12 k€ |
| Plugins Capacitor (gratuit) | 0 € |
| Compte Google Play Developer | 25 USD one-shot |
| Compte Apple Developer (V3) | 99 USD/an |
| Push provider FCM | 0 € (gratuit jusqu'à volume haut) |
| Crash reporting Sentry (free tier) | 0 € (5k events/mois) |
| Hébergement assets (VPS existant) | 0 € |
| **Total V1 hors RH** | **~25 €** + temps dev |

---

## 8. Risques + mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Capacitor bridge fragile sur Android low-end | M | M | Bench réel sur smartphone cible avant V1 final |
| Service Worker offline pas suffisant | M | H | Plugin Capacitor Filesystem + IndexedDB hybride |
| Photos compressées insuffisamment | H | M | Plugin Camera avec compression auto + preview avant upload |
| Push notifs pas fiables | M | M | Doubler avec SMS fallback pour notifs critiques |
| Saïd casse l'app au sideload | H | M | Premier déploiement = agent MCH installe sur place |
| Conflit sync offline si seller utilise web ET app | L | M | Last-write-wins V1 + alerte visuelle si conflit |

---

## 9. TL;DR pour décideur

**Recommandation** : Capacitor + Next.js, V0 PWA en 1-2 sem pour valider parcours, V1 wrap natif APK en 3-4 sem.

**Justification** : équipe React capitalise sa stack, code partagé 95% web, distribution Play Store + sideload OK, capacités natives suffisantes V1, migration RN possible V3 si besoin.

**Investissement V1** : ~1 dev × 5-6 semaines + 25 USD Play Store. Total ordre de grandeur 10-15 k€ build + premier rollout.

**Décision attendue** : valider Capacitor + budget + recruter dev mobile dédié OU former dev web actuel.

---

## 10. Usage mini-prompt

Coller ce document dans une session avec un CTO / lead tech / pour validation. Demander :

1. Validation hypothèse équipe (1-2 devs React, 0 natif)
2. Validation budget (10-15 k€ V1)
3. Validation 10 questions section 6 (à répondre avant build)
4. Décision finale Capacitor vs alternative

Si validé : démarrer V0 prototype dans 1 semaine, V1 wrap natif 3-4 semaines après.

Caveman resume.
