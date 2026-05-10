# RGPD — Droits des utilisateurs IOX

> Document interne — Pilote IOX (Mayotte)
> Dernière mise à jour : 2026-05-11
> Responsable : Admin IOX

---

## 1. Droits RGPD applicables

IOX collecte et traite des données personnelles dans le cadre de son activité de marketplace B2B agricole. Les utilisateurs (vendeurs coopératives et acheteurs B2B) bénéficient des droits suivants au titre du RGPD (Règlement UE 2016/679) :

| Droit | Article RGPD | Description courte |
|---|---|---|
| Accès | Art. 15 | Obtenir une copie de toutes ses données |
| Rectification | Art. 16 | Corriger des données inexactes ou incomplètes |
| Effacement ("droit à l'oubli") | Art. 17 | Demander la suppression de ses données |
| Portabilité | Art. 20 | Recevoir ses données dans un format structuré réutilisable |
| Opposition | Art. 21 | S'opposer à un traitement (notamment commercial) |
| Limitation | Art. 18 | Suspendre un traitement en attendant un arbitrage |

---

## 2. Procédure par droit

### 2.1 Droit d'accès (Art. 15)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Demande d'accès RGPD — [nom complet]" et une pièce d'identité en copie.

**Délai de réponse :** 30 jours calendaires à compter de la réception de la demande complète.

**Qui traite :** Admin IOX (accès base de données et interface admin).

**Traitement technique (pilote — procédure manuelle) :**
1. Vérifier l'identité du demandeur (comparer avec le compte en base).
2. Exécuter les requêtes SQL d'export (voir Section 3).
3. Assembler un fichier JSON + PDF de factures dans un zip protégé par mot de passe.
4. Envoyer le zip au demandeur par email sécurisé avec mot de passe communiqué séparément.
5. Logger la demande dans le tableau de suivi RGPD (fichier `ops/rgpd-requests-log.csv`).

---

### 2.2 Droit de rectification (Art. 16)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Rectification RGPD — [nom complet]" en précisant les données à corriger.

**Délai de réponse :** 30 jours.

**Qui traite :** Admin IOX.

**Traitement technique :**
1. Identifier le champ concerné (profil utilisateur, profil coopérative, coordonnées).
2. Corriger directement via l'interface admin `/admin/users/[id]` ou via `UPDATE` SQL ciblé.
3. Confirmer la modification à l'utilisateur par email.
4. Logger la demande.

---

### 2.3 Droit à l'effacement (Art. 17)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Suppression compte RGPD — [nom complet]".

**Délai de réponse :** 30 jours.

**Qui traite :** Admin IOX.

**Exceptions légales (données non supprimables) :**
- Factures et données financières : obligation légale de conservation 10 ans (Art. L123-22 Code de commerce).
- Logs d'audit de sécurité : 12 mois minimum.
- Données nécessaires à un litige en cours : jusqu'à clôture.

**Traitement technique :** Voir Section 4 — Suppression de compte.

---

### 2.4 Droit à la portabilité (Art. 20)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Portabilité RGPD — [nom complet]".

**Délai de réponse :** 30 jours.

**Qui traite :** Admin IOX.

**Traitement technique :**
1. Exporter les données dans un format structuré (JSON — voir Section 3).
2. Exclure les données dérivées ou agrégées (logs système, métriques).
3. Envoyer le fichier JSON au demandeur.

---

### 2.5 Droit d'opposition (Art. 21)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Opposition traitement RGPD — [nom complet]" en précisant le traitement concerné.

**Délai de réponse :** 30 jours.

**Contexte IOX :** IOX n'envoie pas d'emails marketing. Seuls les emails transactionnels sont envoyés. En cas d'opposition aux emails transactionnels, l'utilisateur peut se désabonner via `/unsubscribe` (lien présent dans chaque email).

**Traitement technique :**
1. Si opposition aux communications non essentielles : basculer `emailConsent = false` sur le profil utilisateur.
2. Si opposition au traitement principal (marketplace) : examiner la légitimité de la demande et, si recevable, procéder à la clôture du compte.

---

### 2.6 Droit à la limitation (Art. 18)

**Comment l'utilisateur le demande :**
Email à rgpd@iox.example avec l'objet "Limitation traitement RGPD — [nom complet]" en expliquant le motif.

**Délai de réponse :** 30 jours.

**Traitement technique :**
1. Identifier le traitement contesté.
2. Désactiver le compte temporairement (`status = SUSPENDED`) sans supprimer les données.
3. Apposer un flag interne `gdprLimitationRequested = true` sur le profil.
4. Informer l'utilisateur et attendre la résolution (contestation, litige, etc.).

---

## 3. Export de données — contenu et format

### 3.1 Données incluses dans l'export

| Catégorie | Champs exportés |
|---|---|
| Compte utilisateur | email, nom, prénom, rôle, date création, statut |
| Profil entreprise | raison sociale, SIRET/équivalent, adresse, téléphone, secteur |
| Historique RFQ | toutes les demandes de devis (statut, dates, produits, montants) |
| Messages | historique des échanges marketplace |
| Factures | références, montants, dates, statuts de paiement |
| Documents uploadés | liste des fichiers (noms, dates, types) — pas le contenu binaire |

### 3.2 Format de l'export

- **Format principal :** JSON structuré (lisible par machine, portabilité RGPD).
- **Format complémentaire :** PDF récapitulatif pour les factures (export depuis Stripe ou génération interne).
- **Livraison :** Archive ZIP protégée par mot de passe, envoyée par email.

### 3.3 Requêtes SQL d'export (pilote — procédure manuelle)

```sql
-- Informations compte
SELECT id, email, "firstName", "lastName", role, status, "createdAt"
FROM users WHERE email = 'utilisateur@example.com';

-- Profil coopérative/acheteur
SELECT * FROM sellers WHERE "userId" = [USER_ID];
SELECT * FROM buyers WHERE "userId" = [USER_ID];

-- RFQ (demandes de devis)
SELECT qr.*, qri."productName", qri.quantity, qri.unit
FROM quote_requests qr
JOIN quote_request_items qri ON qri."quoteRequestId" = qr.id
WHERE qr."buyerId" = [BUYER_ID] OR qr."sellerId" = [SELLER_ID];

-- Messages
SELECT * FROM messages
WHERE "senderId" = [USER_ID] OR "receiverId" = [USER_ID]
ORDER BY "createdAt";

-- Paiements / factures
SELECT * FROM payments
WHERE "buyerId" = [BUYER_ID] OR "sellerId" = [SELLER_ID];

-- Documents
SELECT id, "fileName", "fileType", "uploadedAt", status
FROM documents WHERE "uploadedBy" = [USER_ID];
```

---

## 4. Suppression de compte

### 4.1 Ce qui peut être supprimé

- Données du profil utilisateur (nom, email, mot de passe hashé, téléphone).
- Préférences et paramètres personnels.
- Photos de profil et documents non légalement requis.
- Sessions et tokens actifs.

### 4.2 Ce qui doit être conservé (obligations légales)

| Donnée | Durée de conservation | Base légale |
|---|---|---|
| Factures et données financières | 10 ans | Art. L123-22 Code de commerce |
| Preuves de transactions (paiements) | 10 ans | Obligation fiscale |
| Logs d'audit et de sécurité | 12 mois | Recommandation CNIL / sécurité |
| Données liées à un litige | Durée du litige + prescription | Art. 2224 Code civil |

### 4.3 Processus de suppression (anonymisation)

Pour les enregistrements devant être conservés, on applique une **anonymisation** plutôt qu'une suppression complète : les données personnelles identifiantes sont remplacées par des valeurs neutres, tandis que les données financières et comptables sont préservées intactes.

**Séquence d'exécution (admin) :**

**Étape 1 — Désactivation du compte**
```sql
UPDATE users SET status = 'DEACTIVATED', "updatedAt" = NOW()
WHERE email = 'utilisateur@example.com';
```

**Étape 2 — Révocation des tokens actifs**
```sql
DELETE FROM refresh_tokens WHERE "userId" = [USER_ID];
```
Puis vider le cache Redis pour cet utilisateur : `redis-cli DEL session:[USER_ID]`

**Étape 3 — Anonymisation des PII**
```sql
UPDATE users SET
  email = CONCAT('deleted_', id, '@anonymized.iox'),
  "firstName" = 'ANONYMISÉ',
  "lastName" = 'ANONYMISÉ',
  phone = NULL,
  "passwordHash" = 'DELETED',
  "updatedAt" = NOW()
WHERE id = [USER_ID];

-- Anonymiser le profil vendeur si applicable
UPDATE sellers SET
  "contactEmail" = CONCAT('deleted_', id, '@anonymized.iox'),
  "contactPhone" = NULL,
  "bankIban" = 'ANONYMISÉ'
WHERE "userId" = [USER_ID];
```

**Étape 4 — Conservation des enregistrements financiers**
Les tables `payments` et `invoices` ne sont PAS modifiées. Les références au `userId` sont conservées mais le compte associé est anonymisé.

**Étape 5 — Confirmation et logging**
Envoyer un email de confirmation à l'ancienne adresse (avant anonymisation) et logger la suppression dans `ops/rgpd-requests-log.csv`.

---

## 5. Conservation des données — tableau récapitulatif

| Type de donnée | Durée de conservation | Base légale |
|---|---|---|
| Données de compte (actif) | Durée de vie du compte | Exécution du contrat |
| Données de compte (inactif) | 3 ans après dernière connexion | Intérêt légitime |
| RFQ et devis | 5 ans | Intérêt légitime / preuve |
| Factures et paiements | 10 ans | Obligation légale comptable |
| Messages marketplace | 3 ans | Intérêt légitime |
| Documents uploadés (KYC) | 5 ans après fin relation | Obligation légale (LCB-FT) |
| Logs d'accès et sécurité | 12 mois | Sécurité / recommandation CNIL |
| Logs d'erreurs techniques | 3 mois | Intérêt légitime (débogage) |
| Cookies de session | Session + max 24h | Nécessité technique |
| Données de cache Redis | TTL configuré (max 24h) | Nécessité technique |

---

## 6. Consentement et communications

### 6.1 Politique de communication

IOX n'envoie **aucun email marketing ou promotionnel**. Seuls les emails transactionnels suivants sont envoyés :
- Validation de compte et bienvenue
- Notifications RFQ (nouvelle demande, réponse reçue)
- Confirmation de paiement
- Rappels RFQ (automatisés via BullMQ)
- Notifications de documents validés

### 6.2 Désabonnement

Chaque email transactionnel contient un lien de désabonnement pointant vers `/unsubscribe?token=[TOKEN]`. Ce mécanisme est déjà implémenté dans le backend IOX.

Après désabonnement, le champ `emailConsent = false` est positionné sur le profil utilisateur. L'utilisateur ne reçoit plus aucun email non critique (seuls les emails liés à la sécurité du compte peuvent encore être envoyés, ex : reset mot de passe).

### 6.3 Absence de tracking marketing

IOX ne pose pas de cookies de tracking publicitaire et n'utilise pas de pixel de suivi dans les emails. Aucune donnée n'est transmise à des régies publicitaires tierces.

---

## 7. Page "Mes données" — amélioration future

**Statut : Non implémenté (à prévoir post-pilote)**

Une page `/account/my-data` pourrait être ajoutée pour permettre aux utilisateurs de gérer leurs droits RGPD directement depuis leur espace personnel. Elle inclurait :

- Un résumé des données collectées (catégories et volumes).
- Un bouton "Télécharger mes données" (génération automatique de l'export JSON).
- Un formulaire de demande de suppression de compte.
- Le lien vers la politique de confidentialité.
- Un bouton de désabonnement aux emails.

**Pour le pilote :** Les demandes sont traitées manuellement par email (rgpd@iox.example) selon la procédure décrite dans ce document.

---

## 8. Procédure manuelle support pilote — guide étape par étape

Cette procédure s'applique à toute demande RGPD reçue pendant la phase pilote.

### Étape 1 — Réception et qualification (Jour 1)
- [ ] Réceptionner l'email sur rgpd@iox.example
- [ ] Identifier le type de demande (accès, rectification, effacement, portabilité, opposition, limitation)
- [ ] Vérifier l'identité du demandeur (pièce d'identité requise pour accès et effacement)
- [ ] Envoyer un accusé de réception à l'utilisateur avec le numéro de ticket et le délai de 30 jours
- [ ] Logger la demande dans `ops/rgpd-requests-log.csv` : date, type, utilisateur, délai max

### Étape 2 — Traitement (dans les 25 jours)
- [ ] Se connecter à la base de données PostgreSQL en lecture seule (ou via l'interface admin)
- [ ] Identifier le compte utilisateur par email
- [ ] Appliquer la procédure correspondant au type de demande (Sections 2 et 4)
- [ ] Préparer les données / effectuer les modifications

### Étape 3 — Livraison et clôture (avant Jour 30)
- [ ] Envoyer les données exportées ou la confirmation de modification/suppression
- [ ] Mettre à jour le log `ops/rgpd-requests-log.csv` : date traitement, résultat
- [ ] Archiver les échanges (email + éventuels fichiers) dans le dossier sécurisé `ops/rgpd-archives/`

### Étape 4 — Escalade si délai dépassé
- [ ] Informer l'utilisateur du dépassement de délai et de la nouvelle échéance
- [ ] Signaler le cas à l'équipe IOX pour traitement prioritaire
- [ ] En cas de plainte CNIL : contacter le DPO ou un conseil juridique

---

## 9. Contacts et ressources

| Rôle | Contact |
|---|---|
| Responsable traitement RGPD | Admin IOX — rgpd@iox.example |
| Support technique | support@iox.example |
| Autorité de contrôle (France) | CNIL — [https://www.cnil.fr](https://www.cnil.fr) |
| Formulaire plainte CNIL | [https://www.cnil.fr/fr/plaintes](https://www.cnil.fr/fr/plaintes) |

**Pour toute demande RGPD :** Envoyer un email à rgpd@iox.example en indiquant votre nom complet, l'adresse email de votre compte IOX, et la nature de votre demande. Joindre une copie de pièce d'identité pour les demandes d'accès et d'effacement.

---

*Ce document est un guide opérationnel interne pour la phase pilote IOX. Il doit être mis à jour avant tout passage en production avec un volume d'utilisateurs significatif, et complété par une politique de confidentialité publique et un registre de traitements formalisé.*
