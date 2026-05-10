# Email Deliverability — Configuration et bonnes pratiques IOX

> Document interne — Pilote IOX (Mayotte)
> Dernière mise à jour : 2026-05-11

---

## 1. Provider recommandé

### Recommandation principale : Postmark

**Postmark** est le provider recommandé pour IOX pour les raisons suivantes :
- Deliverability parmi les meilleures du marché (réputation IP dédiée)
- API simple et bien documentée (compatible avec Nodemailer SMTP ou API REST directe)
- Logs détaillés par email : ouverture, bounce, spam report, suppression
- Support réactif
- Tableau de bord clair pour le suivi des envois
- Offre gratuite : 100 emails/mois (suffisant pour le pilote IOX)
- Pas de configuration complexe pour démarrer

**Alternative : Mailgun**
- 1000 emails/mois gratuits (offre de démarrage)
- Logs détaillés et webhook de bounce
- Plus de configuration DNS requise
- Légèrement plus complexe mais très complet

**À ne pas utiliser pour IOX :**
- SendGrid (trop orienté marketing, interface complexe)
- SES (configuration AWS lourde, déconseillé pour pilote)
- SMTP direct depuis le VPS (risque élevé de blacklisting)

**Type d'usage : uniquement emails transactionnels.** IOX n'envoie aucun email marketing ou newsletter.

---

## 2. Configuration DNS

La configuration DNS est essentielle pour la deliverability. Elle doit être faite sur le domaine d'envoi (ex : `mail.iox.example` ou `iox.example` selon choix).

### 2.1 SPF (Sender Policy Framework)

Le SPF indique aux serveurs de messagerie quels serveurs sont autorisés à envoyer des emails au nom du domaine IOX.

**Enregistrement DNS à créer (type TXT, sur le domaine d'envoi) :**

Pour Postmark :
```
v=spf1 include:spf.mtasv.net ~all
```

Pour Mailgun :
```
v=spf1 include:mailgun.org ~all
```

**Syntaxe générique :**
```
v=spf1 include:[domaine-provider] ~all
```

- `~all` : softfail (recommandé — les emails non conformes ne sont pas rejetés mais marqués)
- `-all` : hardfail (plus strict — à utiliser une fois SPF validé)
- Emplacement : enregistrement TXT sur `@` ou sur le sous-domaine d'envoi

**Vérification :**
```bash
dig TXT iox.example +short
# Doit retourner l'enregistrement SPF configuré
```

---

### 2.2 DKIM (DomainKeys Identified Mail)

Le DKIM signe cryptographiquement chaque email pour prouver qu'il provient bien du domaine IOX.

**Procédure :**
1. Dans le Dashboard Postmark (ou Mailgun) : accéder à la section "Domains" → "Sender Signatures".
2. Ajouter le domaine d'envoi IOX.
3. Le provider génère une paire de clés DKIM et fournit un enregistrement TXT à ajouter au DNS.
4. Ajouter l'enregistrement TXT fourni dans la zone DNS du domaine IOX.

**Format de l'enregistrement TXT (exemple Postmark) :**
```
Nom : pm._domainkey.iox.example
Valeur : k=rsa; p=[CLÉ_PUBLIQUE_FOURNIE_PAR_POSTMARK]
```

**Format de l'enregistrement TXT (exemple Mailgun) :**
```
Nom : smtp._domainkey.mg.iox.example
Valeur : k=rsa; p=[CLÉ_PUBLIQUE_FOURNIE_PAR_MAILGUN]
```

**Vérification :**
```bash
dig TXT pm._domainkey.iox.example +short
# Doit retourner la clé publique DKIM
```

**Dans le Dashboard provider :** attendre le statut "Verified" (propagation DNS : 5 minutes à 48 heures).

---

### 2.3 DMARC (Domain-based Message Authentication Reporting)

Le DMARC indique aux serveurs de messagerie comment traiter les emails qui ne passent pas SPF ou DKIM, et permet de recevoir des rapports.

**Enregistrement DNS à créer (type TXT) :**
```
Nom : _dmarc.iox.example
Valeur : v=DMARC1; p=quarantine; rua=mailto:dmarc@iox.example; pct=100; adkim=r; aspf=r
```

**Explications des paramètres :**
- `p=quarantine` : les emails non conformes vont en spam (recommandé pour démarrer — à passer en `p=reject` après 2-3 semaines de monitoring)
- `rua=mailto:dmarc@iox.example` : recevoir les rapports DMARC agrégés (fichiers XML journaliers)
- `pct=100` : appliquer la politique à 100% des emails
- `adkim=r` : alignement DKIM relaxé
- `aspf=r` : alignement SPF relaxé

**Progression recommandée :**
1. Semaine 1 : `p=none` (monitoring sans action)
2. Semaine 2-3 : `p=quarantine` (emails suspects en spam)
3. Semaine 4+ : `p=reject` (emails suspects rejetés) — uniquement si les rapports montrent un SPF/DKIM propre

**Note :** Si IOX utilise un sous-domaine pour les envois (ex : `mg.iox.example` pour Mailgun), le DMARC doit être configuré sur le domaine racine `iox.example` pour couvrir les sous-domaines.

---

### 2.4 Vérification complète de la configuration DNS

```bash
# SPF
dig TXT iox.example +short | grep spf

# DKIM (adapter le sélecteur selon le provider)
dig TXT pm._domainkey.iox.example +short

# DMARC
dig TXT _dmarc.iox.example +short

# Test global : utiliser mail-tester.com
# Envoyer un email de test à l'adresse fournie par mail-tester.com
# Score cible : ≥ 9/10
```

---

## 3. Variables d'environnement

Ces variables doivent être configurées dans le fichier `.env` de production du backend IOX. Ne jamais committer les valeurs réelles dans le code source.

```env
# Configuration SMTP (pour Postmark ou Mailgun SMTP)
SMTP_HOST=smtp.postmarkapp.com
SMTP_PORT=587
SMTP_USER=[À_COMPLÉTER_DEPUIS_DASHBOARD_PROVIDER]
SMTP_PASS=[À_COMPLÉTER_DEPUIS_DASHBOARD_PROVIDER]
SMTP_FROM=noreply@iox.example

# URL de l'application (utilisée dans les liens emails)
APP_URL=https://pilot.iox.example
```

**Pour Postmark :**
- `SMTP_USER` = Server API Token (disponible dans Dashboard → Server → API Tokens)
- `SMTP_PASS` = même valeur que `SMTP_USER` (Postmark utilise le token pour les deux)

**Pour Mailgun :**
- `SMTP_USER` = adresse SMTP login fournie par Mailgun (ex : `postmaster@mg.iox.example`)
- `SMTP_PASS` = SMTP password fourni par Mailgun

**Note de sécurité :** Ces credentials donnent accès à l'envoi d'emails depuis le domaine IOX. Les stocker dans un gestionnaire de secrets (Vault, Bitwarden Teams, ou variables d'environnement du serveur) et jamais en clair dans Git.

---

## 4. Emails transactionnels IOX

Liste exhaustive des emails envoyés par IOX. Chaque email doit contenir un lien de désabonnement.

| Email | Déclencheur | Destinataire | Template |
|---|---|---|---|
| Bienvenue / validation compte | Inscription validée | Nouvel utilisateur | `welcome` |
| RFQ reçue | Nouvelle RFQ créée | Vendeur (coopérative) | `rfq-received` |
| Devis envoyé | Devis soumis par vendeur | Acheteur | `quote-sent` |
| Paiement confirmé | Webhook `payment_intent.succeeded` | Acheteur + Vendeur | `payment-confirmed` |
| Rappel RFQ en attente | Job BullMQ `rfq-reminder` (48h sans réponse) | Vendeur | `rfq-reminder` |
| Documents uploadés validés | Validation admin des docs KYC | Vendeur | `docs-validated` |
| Reset mot de passe | Demande de réinitialisation | Utilisateur | `reset-password` |

**Règle systématique :** Tous les emails (sauf reset mot de passe) doivent inclure en pied d'email :
```
Vous recevez cet email car vous êtes inscrit sur IOX.
[Se désabonner](https://pilot.iox.example/unsubscribe?token=TOKEN)
```

---

## 5. Vérification de APP_URL avant lancement

Tous les liens dans les emails sont construits à partir de la variable d'environnement `APP_URL`. Cette variable est critique : une mauvaise valeur rend tous les liens emails inutilisables.

**Avant le lancement pilote, vérifier :**

```bash
# Sur le serveur de production
grep APP_URL /opt/iox/apps/backend/.env
# Doit retourner : APP_URL=https://pilot.iox.example
```

**Tester chaque type de lien :**
- Lien de validation de compte → doit pointer vers `https://pilot.iox.example/verify-email?token=...`
- Lien de reset mot de passe → doit pointer vers `https://pilot.iox.example/reset-password?token=...`
- Lien de désabonnement → doit pointer vers `https://pilot.iox.example/unsubscribe?token=...`
- Liens vers les RFQ → doivent pointer vers `https://pilot.iox.example/rfq/[ID]`

**Erreurs fréquentes :**
- `APP_URL=http://localhost:3000` (oublié de changer depuis le développement local)
- `APP_URL=https://pilot.iox.example/` (slash final qui duplique le séparateur dans les URLs générées)
- Variable non définie (les liens seront générés avec `undefined/...`)

---

## 6. Tests pré-lancement

Effectuer ces tests avant d'inviter les premiers utilisateurs pilotes.

### 6.1 Envoi des emails de test

Envoyer un email de chaque type à une adresse de test interne (ex : test@iox.example ou une adresse Gmail/Outlook personnelle) :

```bash
# Depuis l'interface admin IOX ou via une commande NestJS
# Ex : npm run seed:test-emails -- --type=all --to=test@iox.example
```

Pour chaque email reçu, vérifier :
- [ ] L'email est reçu (pas dans les spams)
- [ ] L'expéditeur affiché est correct (`IOX <noreply@iox.example>`)
- [ ] Tous les liens sont cliquables et pointent vers la bonne URL (pilot.iox.example)
- [ ] Le lien de désabonnement est présent et fonctionnel
- [ ] Le contenu est en français et sans faute
- [ ] Le rendu HTML est correct sur mobile et desktop

### 6.2 Score anti-spam avec mail-tester.com

1. Aller sur [mail-tester.com](https://www.mail-tester.com)
2. Copier l'adresse email fournie (ex : `test-xyz@mail-tester.com`)
3. Déclencher l'envoi d'un email IOX vers cette adresse
4. Consulter le rapport sur mail-tester.com

**Score cible : ≥ 9/10.** Un score inférieur indique des problèmes DNS ou de contenu à corriger avant le lancement.

**Problèmes fréquents détectés par mail-tester.com :**
- SPF non configuré ou incorrect → vérifier Section 2.1
- DKIM non signé → vérifier Section 2.2
- DMARC manquant → vérifier Section 2.3
- Liens brisés dans l'email → vérifier APP_URL (Section 5)
- Ratio texte/HTML déséquilibré → adapter les templates

### 6.3 Test du désabonnement

1. Envoyer un email de test contenant le lien `/unsubscribe`
2. Cliquer sur le lien de désabonnement
3. Vérifier que la page `/unsubscribe` s'affiche correctement
4. Vérifier en base que `emailConsent = false` pour l'utilisateur de test
5. Vérifier qu'un email de confirmation de désabonnement est envoyé (si implémenté)
6. Vérifier que l'utilisateur ne reçoit plus d'emails transactionnels (sauf reset mot de passe)

---

## 7. Gestion des bounces

Les bounces (emails non délivrables) dégradent la réputation d'envoi si non traités.

### 7.1 Types de bounces

- **Hard bounce :** email invalide ou domaine inexistant. L'adresse doit être désactivée immédiatement.
- **Soft bounce :** boîte pleine ou serveur temporairement indisponible. Réessayer automatiquement.

### 7.2 Configuration du webhook de bounce

**Postmark :**
Postmark Dashboard → Server → Webhooks → Bounce Webhook.
URL de destination : `https://api.pilot.iox.example/email/bounce` (à implémenter si non existant).

**Mailgun :**
Mailgun Dashboard → Sending → Webhooks → Permanent Failure (bounce).
URL de destination : `https://api.pilot.iox.example/email/bounce`.

### 7.3 Procédure manuelle (pilote)

Pour le pilote, si le webhook de bounce n'est pas implémenté, suivre cette procédure manuelle :

1. Consulter les logs d'envoi dans le Dashboard Postmark/Mailgun chaque semaine.
2. Identifier les hard bounces (adresses invalides).
3. Dans la base IOX, marquer ces comptes : `UPDATE users SET emailValid = false WHERE email = '[EMAIL_BOUNCE]';`
4. Contacter le support IOX pour corriger l'adresse de l'utilisateur si possible.
5. Ne pas renvoyer d'emails vers des adresses en hard bounce (risque de blacklisting).

---

## 8. Limites des offres gratuites (pilote)

| Provider | Volume gratuit | Période | Suffisant pour pilote ? |
|---|---|---|---|
| Postmark | 100 emails/mois | Mensuel | Oui (pilote 5 vendeurs + 10 acheteurs) |
| Mailgun | 1 000 emails/mois | Mensuel | Oui, avec marge |

**Estimation volume pilote IOX :**
- ~15 utilisateurs actifs
- ~3-5 emails transactionnels par utilisateur par semaine en période active
- Volume estimé : ~200-400 emails/mois maximum

**Conclusion :** L'offre gratuite Mailgun (1000/mois) couvre largement le pilote. Postmark (100/mois) peut être juste si le volume d'activité est élevé — préférer Mailgun ou passer sur le plan Postmark payant ($15/mois pour 10 000 emails).

**Quand passer au plan payant :**
- Si le volume d'envoi dépasse 80% du quota gratuit sur 2 semaines consécutives
- Avant tout lancement en production avec plus de 50 utilisateurs actifs

---

*Conserver ce document à jour à chaque changement de provider ou de configuration DNS. Toute modification DNS peut prendre jusqu'à 48h pour se propager.*
