# Stripe Live — Checklist finale activation IOX

> Document interne — Pilote IOX (Mayotte)
> Dernière mise à jour : 2026-05-11
> A exécuter uniquement quand TOUS les prérequis sont cochés

---

## 1. Prérequis avant activation

Chaque item doit être validé avant de passer en mode live. Ne pas activer Stripe live si un seul item est manquant.

### 1.1 Compte Stripe

- [ ] Le compte Stripe IOX est entièrement vérifié (statut "Actif" dans le Dashboard Stripe)
- [ ] Les informations légales de l'entreprise sont complètes (raison sociale, adresse, dirigeant)
- [ ] Le compte bancaire de réception est enregistré et vérifié par Stripe
- [ ] Les CGU Stripe Connect ont été acceptées
- [ ] L'accès au Dashboard Stripe est sécurisé (2FA activé sur le compte Stripe)

### 1.2 KYC vendeurs

- [ ] Le KYC Stripe a été initié pour chaque coopérative vendeuse du pilote (minimum 2 sur 5)
- [ ] Au moins 1 coopérative a le statut `charges_enabled = true` dans Stripe
- [ ] Le flux `account.updated` webhook a été testé pour déclencher la mise à jour du statut en base

### 1.3 Webhook production

- [ ] L'endpoint webhook de production est créé dans le Stripe Dashboard (Développeurs → Webhooks)
- [ ] L'URL de l'endpoint pointe vers `https://api.pilot.iox.example/stripe/webhook` (ou URL production réelle)
- [ ] Tous les événements requis (Section 2) sont sélectionnés dans la configuration du webhook
- [ ] Le `STRIPE_WEBHOOK_SECRET` a été copié depuis le Dashboard et mis à jour dans le `.env` de production
- [ ] Le webhook secret utilisé correspond à l'endpoint production (pas celui de test ou CLI)

### 1.4 Clés API

- [ ] `STRIPE_SECRET_KEY` remplacée : la valeur commence par `sk_live_` (pas `sk_test_`)
- [ ] `STRIPE_PUBLISHABLE_KEY` remplacée : la valeur commence par `pk_live_` (pas `pk_test_`)
- [ ] Aucune clé live n'est committée dans le code source ou dans Git
- [ ] Les clés live sont stockées uniquement dans le gestionnaire de secrets ou le `.env` de production (hors repo)
- [ ] Les anciennes clés test sont révoquées dans le Dashboard Stripe si elles ne sont plus utilisées

### 1.5 Tests validés en mode test

- [ ] Parcours complet de paiement testé en mode test (end-to-end) : RFQ → devis → paiement → confirmation
- [ ] Flux de remboursement testé (refund initié depuis le Dashboard Stripe test)
- [ ] Flux de paiement échoué testé (carte déclinée, fonds insuffisants) avec récupération côté acheteur
- [ ] Webhooks reçus et traités correctement pour tous les événements listés (Section 2)
- [ ] Le statut de paiement est correctement mis à jour en base après chaque événement webhook

---

## 2. Événements webhook à activer

Sélectionner exactement ces événements dans la configuration du webhook Stripe Dashboard.

| Événement | Description | Impact métier |
|---|---|---|
| `payment_intent.succeeded` | Paiement confirmé | Déclenche la livraison / confirmation commande |
| `payment_intent.payment_failed` | Paiement échoué | Notifie l'acheteur, relance possible |
| `payment_intent.canceled` | Paiement annulé | Libère le stock réservé, notifie les parties |
| `account.updated` | Compte vendeur Stripe mis à jour | Met à jour le statut KYC du vendeur en base |
| `transfer.created` | Transfert vers vendeur créé | Notification de virement au vendeur |
| `payout.paid` | Virement effectué vers le compte bancaire | Confirmation comptable |
| `payout.failed` | Virement échoué | Alerte admin, résolution manuelle requise |
| `charge.dispute.created` | Litige (chargeback) ouvert | Alerte critique admin, action sous 7 jours |

---

## 3. Séquence d'activation (étapes numérotées)

Exécuter dans cet ordre exact. Ne pas sauter d'étape.

**Étape 1 — Récupérer les clés live dans Stripe Dashboard**
Stripe Dashboard → Développeurs → Clés API → Révéler la clé secrète live.
Copier `sk_live_...` et `pk_live_...` dans un gestionnaire de secrets sécurisé (Bitwarden, 1Password, etc.).

**Étape 2 — Créer l'endpoint webhook de production**
Stripe Dashboard → Développeurs → Webhooks → Ajouter un endpoint.
URL : `https://api.pilot.iox.example/stripe/webhook`
Sélectionner tous les événements listés en Section 2.
Valider.

**Étape 3 — Copier le STRIPE_WEBHOOK_SECRET**
Dans la page de l'endpoint webhook créé à l'étape 2 : révéler et copier le "Secret de signature" (commence par `whsec_`).

**Étape 4 — Mettre à jour le .env de production**
Sur le serveur de production (via SSH) :
```bash
# Éditer le fichier .env de production du backend
nano /opt/iox/apps/backend/.env
# Remplacer les variables suivantes :
# STRIPE_SECRET_KEY=sk_live_[VOTRE_CLE_LIVE]
# STRIPE_PUBLISHABLE_KEY=pk_live_[VOTRE_CLE_LIVE]
# STRIPE_WEBHOOK_SECRET=whsec_[VOTRE_SECRET_WEBHOOK]
```
Ne jamais partager ces valeurs par email ou messagerie non chiffrée.

**Étape 5 — Redémarrer le backend**
```bash
pm2 restart backend
pm2 logs backend --lines 50  # Vérifier absence d'erreur au démarrage
```

**Étape 6 — Vérifier la connexion Stripe au démarrage**
Dans les logs : chercher "Stripe initialized" ou équivalent. Absence d'erreur `401 Unauthorized` ou `Invalid API key`.

**Étape 7 — Test webhook avec Stripe CLI**
```bash
# Sur la machine locale avec Stripe CLI installé
stripe login
stripe trigger payment_intent.succeeded --api-key sk_live_[VOTRE_CLE]
# Vérifier dans les logs backend que l'événement est bien reçu et traité
```

**Étape 8 — Vérifier account.updated pour le premier vendeur KYC**
Dans le Dashboard Stripe : Connect → Comptes → sélectionner la première coopérative.
Déclencher manuellement une mise à jour ou attendre la notification Stripe post-vérification.
Vérifier en base que `seller.stripeAccountStatus` est mis à jour.

**Étape 9 — Premier vrai paiement de test (montant minimal)**
Utiliser une vraie carte bancaire de test interne IOX pour effectuer un paiement réel minimal (ex : 1,00 EUR) sur l'environnement de production.
Vérifier : paiement reçu dans Stripe Dashboard (mode live), webhook reçu, statut mis à jour en base, email de confirmation envoyé.

**Étape 10 — Surveiller les logs pendant 24 heures**
```bash
pm2 logs backend --lines 200
# Ou via l'outil de monitoring configuré (voir notes/monitoring-alerting-iox.md)
```
Chercher : erreurs Stripe (`stripe.error`), webhooks non traités, timeouts.

**Étape 11 — Activer les alertes dans le Stripe Dashboard**
Stripe Dashboard → Paramètres → Alertes.
Activer : alertes disputes, alertes paiements échoués en volume anormal, alertes virements échoués.
Configurer l'email de destination vers support@iox.example.

**Étape 12 — Validation finale et notification équipe**
- [ ] Envoyer un message à l'équipe IOX confirmant l'activation live
- [ ] Documenter la date et l'heure d'activation
- [ ] Mettre à jour le statut dans le tableau de bord du pilote

---

## 4. Rollback — retour en mode test

En cas de problème grave (paiements bloqués, erreurs critiques, comportement inattendu) :

**Procédure de rollback :**

```bash
# 1. Arrêter le backend
pm2 stop backend

# 2. Revenir aux clés test dans .env
# STRIPE_SECRET_KEY=sk_test_[VOTRE_CLE_TEST]
# STRIPE_PUBLISHABLE_KEY=pk_test_[VOTRE_CLE_TEST]
# STRIPE_WEBHOOK_SECRET=whsec_[VOTRE_SECRET_WEBHOOK_TEST]

# 3. Redémarrer
pm2 start backend
pm2 logs backend --lines 50
```

**Important :** Les paiements déjà capturés en mode live ne sont pas affectés par le rollback. Ils doivent être gérés directement dans le Dashboard Stripe live. Tout paiement en attente doit être remboursé manuellement si la transaction ne peut être honorée.

**Notifier :** Prévenir immédiatement les vendeurs et acheteurs actifs en cas de basculement d'urgence.

---

## 5. Checklist KYC vendeurs

Chaque coopérative vendeuse doit fournir les éléments suivants pour compléter son KYC Stripe Connect :

### Documents requis par Stripe

- [ ] Pièce d'identité du représentant légal (passeport ou carte d'identité nationale, recto-verso)
- [ ] Justificatif de domicile du représentant légal (moins de 3 mois)
- [ ] Extrait Kbis ou équivalent local (statuts de la coopérative, récépissé de déclaration)
- [ ] RIB / IBAN du compte bancaire de la coopérative
- [ ] Numéro SIRET ou équivalent fiscal local (Mayotte : numéro RNA ou SIREN)

### Informations à renseigner dans le formulaire Stripe Connect

- [ ] Nom légal de la coopérative
- [ ] Adresse du siège social
- [ ] Secteur d'activité (agriculture / commerce de gros)
- [ ] Chiffre d'affaires annuel estimé
- [ ] Nom, prénom, date de naissance et nationalité du représentant légal
- [ ] Pourcentage de détention (si applicable pour les bénéficiaires effectifs)

### Statuts Stripe à atteindre avant live

- `charges_enabled: true` — le vendeur peut recevoir des paiements
- `payouts_enabled: true` — le vendeur peut recevoir des virements
- `requirements.currently_due: []` — aucun document manquant

---

## 6. Limites du mode test Stripe (rappel)

Le mode test Stripe présente les limitations suivantes — à ne pas confondre avec le mode live :

| Caractéristique | Mode test | Mode live |
|---|---|---|
| Argent réel | Non — transactions fictives | Oui — argent réel prélevé |
| Cartes acceptées | Cartes de test Stripe uniquement | Vraies cartes bancaires |
| Virements | Simulés, jamais exécutés | Exécutés vers vrais comptes bancaires |
| Disputes/chargebacks | Testables via Stripe CLI | Réelles, avec délais et frais |
| Limites de volume | Aucune limite de test | Limites selon niveau vérification compte |
| Frais Stripe | Aucun | 1,4% + 0,25€ (EU) ou tarif négocié |
| Webhooks | Testables via CLI ou Dashboard | Envoyés en temps réel |
| Comptes Connect | Stripe fournit des comptes test | Vraies coopératives avec vrai KYC |

**Règle absolue pour le pilote :** Tant que les tests ne sont pas tous validés, maintenir les clés `sk_test_` en production. Ne basculer en live qu'une fois l'ensemble des prérequis de la Section 1 cochés.

---

*Document à archiver après chaque activation ou rollback avec la date et la personne responsable.*
