# MP-NOTIF-3 phase 2a — Page de désinscription `/unsubscribe`

## Objectif

Donner une UX d'opt-out humaine (au-delà du header `List-Unsubscribe`
machine) pour les emails transactionnels marketplace IOX. Cette phase
2a livre **uniquement le frontend** ; le backend (`POST /notif-email/unsubscribe`,
modèle Prisma `EmailUnsubscribe`) est porté par la branche
`mp-notif-2-unsubscribe` (mandate 19) et arrivera après merge.

## Route

| Route                                       | Auth | Description                              |
| ------------------------------------------- | ---- | ---------------------------------------- |
| `/unsubscribe?token=<opaque>&email=<email>` | non  | Confirmation visuelle + opt-out humain. |

Page accessible sans authentification (placée hors des groupes `(auth)`
et `(dashboard)`).

## Contrat URL

- `token` (string, ≥ 8 caractères) : jeton signé inclus dans le lien
  des emails transactionnels (header `List-Unsubscribe-Post` + lien
  pied de page). Validé côté backend en phase 2b.
- `email` (string, optionnel) : email destinataire, affiché en
  confirmation pour rassurer l'utilisateur (« vous êtes bien sur le
  point de désinscrire `<email>` »).

## États affichés

1. **Lien invalide** — token absent ou trop court (< 8 chars). Affiche
   un bloc orange avec invitation à contacter le support
   (`support@iox.example`).
2. **Confirmation** (état initial avec token valide) — récapitule
   l'email, explique ce qui sera désactivé, propose un bouton
   `Me désinscrire` ou un lien `Annuler` vers la home.
3. **Loading** — bouton désactivé pendant la requête.
4. **Succès** — bloc vert : confirmation + rappel que les emails
   strictement nécessaires (sécurité, facturation) restent actifs.
5. **Erreur** — alert rouge avec message backend.

## Branchement backend (phase 2b)

Le `onConfirm()` actuel est une simulation (200 ms `setTimeout`). Quand
mandate 19 sera mergé, remplacer le bloc TODO par :

```ts
import { notifEmailApi } from '@/lib/notif-email';
await notifEmailApi.unsubscribe({ token });
```

Le helper côté frontend reste à créer (1 méthode `unsubscribe`,
`POST /notif-email/unsubscribe`).

## Tests

`apps/frontend/src/app/unsubscribe/page.test.tsx` — 5 specs :
- état "lien invalide" sans token
- form de confirmation avec token valide + email
- transition `idle → loading → success` sur clic
- lien Annuler vers `/`
- mention `support@iox.example` dans le bloc invalide

```bash
pnpm --filter @iox/frontend exec vitest run src/app/unsubscribe
# Test Files  1 passed (1) — Tests  5 passed (5)
```

## Décisions

- **Pas d'I/O réseau en phase 2a** — la page délivre l'UX, le backend
  arrive séparément. La simulation 200 ms évite un faux sentiment de
  bug (délai instantané = pas d'effet visuel de "loading").
- **Suspense boundary requise** — `useSearchParams` en App Router doit
  être enveloppé dans `<Suspense>` pour le SSR.
- **Pas de Tailwind premium-* shortcuts** — la page est servie hors
  layout dashboard donc on s'appuie sur `slate-*` directement, ce qui
  évite tout risque de styles non chargés.
- **Pas de cookie / tracking** — la page est servie sans `AuthProvider`
  côté UX (root layout déjà installé), elle ne lit ni n'écrit de
  cookie applicatif.

## Hors-scope (phase 2b)

- Endpoint backend `POST /notif-email/unsubscribe` + modèle
  `EmailUnsubscribe` (déjà préparé sur branche mandat 19).
- Page admin `/admin/notif-email/unsubscribes` (suite logique de
  l'EmailLog admin).
- Auto-link depuis le footer des emails (déjà templaté en
  `MP_NOTIF_1_PHASE_1`, à compléter quand le `token` réel sera disponible).
