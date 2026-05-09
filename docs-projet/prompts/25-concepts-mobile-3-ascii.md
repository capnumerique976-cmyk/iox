# 3 concepts visuels app mobile IOX seller — wireframes ASCII

> Wireframes basse fidélité pour amorcer recherche utilisateur (cf trame 24, brief 23). À tester en présentiel sur impressions papier A4. Chaque concept = écran accueil + écran "ajouter produit" étape 1.

Cible : smartphone 5,5" portrait (~360 × 640 dp). 1 case ASCII ≈ 1 zone tactile.

---

## Concept A — "WhatsApp Marketplace"

Codes WhatsApp directs. Le seller voit son app comme une messagerie boostée commerce.

### A.1 — Accueil (timeline conversations + produits)

```
┌────────────────────────────────┐
│ ☰  IOX Marketplace        🔍  │  ← header simple, hamburger + search
├────────────────────────────────┤
│ [Mes Produits] [Demandes]      │  ← 2 onglets larges
├────────────────────────────────┤
│ ┌────────────────────────────┐ │
│ │ 🟢 Demande nouvelle         │ │
│ │ Acheteur Lyon — vanille     │ │  ← bulle style WhatsApp
│ │ "Bonjour, 10kg pour..."     │ │
│ │ il y a 2h          📷 voc   │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ 🟡 Devis envoyé             │ │
│ │ Acheteur Paris — mangue     │ │
│ │ "OK pour le prix..."        │ │
│ │ hier               🟢 lu    │ │
│ └────────────────────────────┘ │
│                                │
│ ┌────────────────────────────┐ │
│ │ ✅ Vente terminée            │ │
│ │ Acheteur Berlin — café      │ │
│ │ il y a 3 jours              │ │
│ └────────────────────────────┘ │
│                                │
│                      ┌─────┐   │
│                      │  +  │   │  ← FAB ajouter produit
│                      └─────┘   │
├────────────────────────────────┤
│ [💬 Discuss] [🌿 Produits] [👤]│  ← bottom nav 3 onglets
└────────────────────────────────┘
```

### A.2 — Ajouter produit (style nouvelle conversation WhatsApp)

```
┌────────────────────────────────┐
│ ←  Nouveau produit              │
├────────────────────────────────┤
│                                │
│   ┌──────────────────────┐    │
│   │                      │    │
│   │       📷 PHOTO       │    │  ← grosse zone photo
│   │   Tapez pour ajouter │    │
│   │                      │    │
│   └──────────────────────┘    │
│                                │
│   Nom du produit               │
│   ┌──────────────────────┐    │
│   │ Vanille de Mayotte   │ 🎤 │  ← input + micro
│   └──────────────────────┘    │
│                                │
│   Catégorie                    │
│   ┌──────────────────────┐    │
│   │ 🌿 Vanille          ▼ │    │  ← picker visuel
│   └──────────────────────┘    │
│                                │
│   ┌──────────────────────┐    │
│   │   ENVOYER  ➤         │    │  ← gros bouton style WhatsApp
│   └──────────────────────┘    │
│                                │
│                                │
└────────────────────────────────┘
```

**Forces** :
- Saïd reconnaît immédiatement (90% du parc connaît WhatsApp)
- Métaphore "envoyer un produit comme un message" intuitive
- Vocal natif partout (familier)
- Aucune courbe d'apprentissage pour la lecture du thread RFQ

**Faiblesses** :
- Confusion possible avec WhatsApp réel (risque envoyer message à un contact perso)
- Pas de structure "marketplace" forte (où sont les filtres, la qualité, etc.)
- Devient vite le bordel quand 50+ produits/demandes
- Positionnement "messagerie" pas "outil pro" — risque dévaluation

---

## Concept B — "Photo-First" (caméra augmentée)

L'app = appareil photo. Tout part de la caméra. Boutons et data autour.

### B.1 — Accueil (caméra ouverte par défaut)

```
┌────────────────────────────────┐
│  ⚙             3 demandes 🔔  │  ← header minimal
├────────────────────────────────┤
│                                │
│                                │
│        [VIEWFINDER CAMÉRA]     │  ← caméra prend 80% écran
│                                │
│        Photo de votre récolte  │
│                                │
│                                │
│                                │
│                                │
│                                │
│              ╔══╗              │  ← gros cercle obturateur
│              ║● ║              │
│              ╚══╝              │
│                                │
│   📁 Mes      🔄 Voir          │
│   produits    demandes         │
│                                │
└────────────────────────────────┘
```

### B.2 — Après photo prise (workflow guidé)

```
┌────────────────────────────────┐
│ ←  Étape 1/3 — Identifier       │
├────────────────────────────────┤
│                                │
│   ┌──────────────────────┐    │
│   │  [PHOTO PRISE]       │    │  ← preview photo
│   │                      │    │
│   │        ✕ refaire     │    │
│   └──────────────────────┘    │
│                                │
│   C'est quoi ?                 │
│                                │
│   ┌─────┐ ┌─────┐ ┌─────┐    │
│   │ 🌿  │ │ 🥭  │ │ ☕  │    │  ← grille pictogrammes
│   │Vanil│ │Mangu│ │Café │    │
│   └─────┘ └─────┘ └─────┘    │
│                                │
│   ┌─────┐ ┌─────┐ ┌─────┐    │
│   │ 🌺  │ │ 🌰  │ │ ❓  │    │
│   │Ylang│ │Cacao│ │Autre│    │
│   └─────┘ └─────┘ └─────┘    │
│                                │
│   ┌──────────────────────┐    │
│   │  Continuer  →        │    │
│   └──────────────────────┘    │
│                                │
└────────────────────────────────┘
```

**Forces** :
- Action photo = la plus naturelle pour Saïd (déjà fait dans WhatsApp)
- Workflow ultra-guidé, 1 décision/écran
- Zéro saisie texte obligatoire (catégorie via picker)
- Cohérent avec un agriculteur en plein champ qui filme sa récolte
- Différencie clairement "outil pro" vs WhatsApp

**Faiblesses** :
- Démarrage forcé sur caméra peut désorienter Maeva/Jean-Bruno (qui veulent voir leur dashboard d'abord)
- Conso batterie + data si caméra ouverte par défaut
- Si pas de produit à photographier ce jour-là, l'app paraît "inutile"
- Zone photo permanente = écran moins riche pour autres infos

---

## Concept C — "Liste Épurée"

Minimaliste. Texte + icônes. Pensé TalkBack/VoiceOver d'abord. Densité info modulable.

### C.1 — Accueil (liste verticale)

```
┌────────────────────────────────┐
│  IOX                       👤  │
├────────────────────────────────┤
│                                │
│   Bonjour Saïd                 │
│   Coopérative Vanille Mayotte  │
│                                │
├────────────────────────────────┤
│                                │
│  ▶ Mes produits           (3)  │  ← liste tappable
│  ▶ Demandes en attente    (2)  │
│  ▶ Devis envoyés          (1)  │
│  ▶ Ventes finalisées      (8)  │
│                                │
├────────────────────────────────┤
│                                │
│   ┌──────────────────────┐    │
│   │  🌿  Ajouter produit │    │  ← action principale
│   └──────────────────────┘    │
│                                │
│   ┌──────────────────────┐    │
│   │  📞  Demander aide   │    │  ← bascule WhatsApp agent MCH
│   └──────────────────────┘    │
│                                │
│                                │
│                                │
│                                │
├────────────────────────────────┤
│ [Accueil] [Listes] [⋯]         │  ← bottom nav 3 tabs
└────────────────────────────────┘
```

### C.2 — Ajouter produit (formulaire 1 colonne, scroll)

```
┌────────────────────────────────┐
│ ←  Ajouter un produit          │
├────────────────────────────────┤
│                                │
│   1. Photo                     │
│   ┌──────────────────────┐    │
│   │   📷  Prendre photo  │    │
│   └──────────────────────┘    │
│                                │
│   2. Nom                       │
│   ┌──────────────────────┐    │
│   │                    🎤│    │
│   └──────────────────────┘    │
│                                │
│   3. Catégorie                 │
│   ┌──────────────────────┐    │
│   │ Choisir...        ▼  │    │
│   └──────────────────────┘    │
│                                │
│   4. Quantité disponible       │
│   ┌──────────────────────┐    │
│   │              [- 0 +] │    │  ← stepper
│   └──────────────────────┘    │
│                                │
│   ┌──────────────────────┐    │
│   │   Enregistrer        │    │
│   └──────────────────────┘    │
│                                │
└────────────────────────────────┘
```

**Forces** :
- TalkBack/VoiceOver natif sans adaptation (linéaire)
- Densité info élevée pour Maeva/Jean-Bruno
- Mode "expert" facile à activer (réduit les paddings)
- Pattern formulaire familier (même si peu utilisé par Saïd) = accessible aux migrations futures depuis web
- Pas de surprise, pas de magie, prévisible

**Faiblesses** :
- Démarche "remplir un formulaire" intimidante pour Saïd
- Texte dominant = barrière pour low-literacy textuelle
- Manque d'âme, peu engageant émotionnellement
- Numérotation 1/2/3/4 = perçue scolaire/administratif

---

## Comparatif rapide

| Critère | A WhatsApp | B Photo-first | C Liste épurée |
|---|---|---|---|
| Familiarité Saïd | ★★★★★ | ★★★★ | ★★ |
| Familiarité Maeva | ★★★★ | ★★★ | ★★★★ |
| Familiarité Jean-Bruno | ★★ | ★★★ | ★★★★★ |
| Accessibilité TalkBack | ★★★ | ★★ | ★★★★★ |
| Vitesse "ajouter produit" | ★★★ | ★★★★★ | ★★ |
| Conso batterie | ★★★★ | ★★ | ★★★★★ |
| Perception "outil pro" | ★★ | ★★★★ | ★★★★★ |
| Différentiation vs WhatsApp | ★ | ★★★★ | ★★★★★ |

---

## Hypothèse arbitrage (à valider terrain)

**Concept B (Photo-first) gagne probablement** pour 3 raisons :

1. Action photo = pont familier WhatsApp + différentiation pro
2. Workflow guidé 1 décision/écran = compatible Saïd
3. Mode "voir mes produits" toujours 1 tap = compatible Maeva/Jean-Bruno

**Hybride potentiel** : caméra accessible en 1 tap depuis n'importe quel écran (FAB persistant), mais accueil = liste type C (plus rassurant pour Maeva). Best of both.

**À tester impérativement en terrain** :
- Saïd ouvre l'app B et voit la caméra : confusion ou enthousiasme ?
- Saïd lit la liste C et identifie "Mes produits" : OK ou fuite ?
- Saïd reçoit notif RFQ A : confond avec WhatsApp réel ou pas ?

---

## Usage

Imprimer A4, présenter dans cet ordre durant section 5 trame entretien (cf 24). Demander :

1. "Que voyez-vous ?" → vocabulaire spontané
2. "Que feriez-vous en premier ?" → priorité perçue
3. Tâche : "Ajouter votre vanille à vendre" → succès/échec/abandon
4. Préférence + raisons → arbitrage final

Captures verbatim. Photos pointage doigt si OK consentement.

---

Caveman resume. Itère après terrain.
