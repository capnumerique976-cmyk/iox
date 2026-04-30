# Activation Resend en production

> Doc de bascule du transport email du mode `mock` vers `resend` en production VPS. À exécuter par l'ops user.

## TL;DR

1. Créer compte Resend + ajouter domaine `iox.mch` → vérifier DKIM/SPF/DMARC.
2. Tester envoi initial via dashboard Resend.
3. Lancer `deploy/scripts/activate-resend.sh` (bascule env VPS).
4. Lancer `deploy/scripts/smoke-resend.sh` (vérifie pipeline post-bascule).
5. Si problème → rollback en 30 sec via re-bascule `NOTIF_EMAIL_TRANSPORT=mock`.

---

## 1. Pré-requis

- [ ] Compte Resend créé : https://resend.com (free tier 3000 emails/mois + 100/jour OK pour V1).
- [ ] Domaine `iox.mch` ajouté côté Resend → onglet "Domains".
- [ ] Accès DNS `iox.mch` (Cloudflare ou registrar).
- [ ] Accès SSH au VPS (`rahiss-vps`).
- [ ] API key Resend récupérée (commence par `re_...`). **NE JAMAIS COMMITTER**.

---

## 2. DKIM + SPF + DMARC

Resend dashboard fournit les 3 records DNS exacts. À copier-coller dans la zone DNS de `iox.mch`.

### SPF (TXT record sur `iox.mch`)

```
v=spf1 include:_spf.resend.com ~all
```

Si SPF existant : merger les `include:` (un seul record SPF autorisé par domaine).

### DKIM (CNAME ou TXT, fourni par Resend)

```
Selector: resend._domainkey
Type: TXT
Value: <fourni par Resend dashboard, ~250 caractères, base64>
```

### DMARC (TXT record sur `_dmarc.iox.mch`)

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@iox.mch; pct=100; adkim=s; aspf=s
```

`p=quarantine` = mails non-conformes en spam (pas de bounce). Passer à `p=reject` après 1 mois sans incident.

### Vérification post-propagation

Délai : ~1h à 24h selon TTL DNS.

```bash
dig +short TXT iox.mch | grep -i spf
dig +short TXT resend._domainkey.iox.mch
dig +short TXT _dmarc.iox.mch
```

Côté Resend dashboard : badge "Verified" sur le domaine. Si rouge → revérifier records (typo classique sur DKIM trop long).

---

## 3. Test envoi initial

Resend dashboard → "Emails" → "Send" → destinataire `ops@iox.mch` (ou perso) → vérifier `delivered` status. Si `bounced` → DNS mal propagé.

---

## 4. Bascule env VPS

### Variables à set dans `.env` VPS

```
NOTIF_EMAIL_TRANSPORT=resend
RESEND_API_KEY=re_xxx_secret
RESEND_FROM_EMAIL=notifications@iox.mch
RESEND_FROM_NAME=IOX Notifications
```

### Script automatisé

```bash
# Local : exporter API key avant exécution
export RESEND_API_KEY=re_xxx_secret_from_dashboard

# Lance bascule via SSH
./deploy/scripts/activate-resend.sh
```

Le script :
1. Backup `.env` actuel (`.env.backup-YYYYMMDD-HHMMSS`).
2. Update `NOTIF_EMAIL_TRANSPORT=resend` + `RESEND_API_KEY=...` dans `.env` VPS.
3. Restart container backend (Docker Compose).
4. Healthcheck.

---

## 5. Smoke post-bascule

```bash
./deploy/scripts/smoke-resend.sh
```

Le script :
1. Login `smoke-buyer@iox.mch`.
2. Récupère 1 offre publique.
3. Crée RFQ test → trigger email vers seller.
4. Vérifie `email_logs` table : dernier row a `status=SENT` + `provider_message_id` non null.
5. Affiche les 3 derniers `email_logs`.

Validation manuelle additionnelle :
- Resend dashboard → "Emails" → vérifier email présent + status `delivered`.
- Boîte mail destinataire → email reçu (DKIM vert).

---

## 6. Rollback

Si problème (email non reçu, bounce, throttle) :

```bash
ssh rahiss-vps
cd /opt/apps/iox
sed -i 's/^NOTIF_EMAIL_TRANSPORT=resend/NOTIF_EMAIL_TRANSPORT=mock/' .env
docker compose -f docker-compose.vps.yml restart backend
```

Comportement V0 immédiat. **0 perte** : `EmailLog` persistent même en mock (rows visibles côté admin `/admin/notif-email/logs`).

Restore complet via backup `.env.backup-*` :

```bash
cp .env.backup-YYYYMMDD-HHMMSS .env
docker compose -f docker-compose.vps.yml restart backend
```

---

## 7. Coût & limites

| Plan | Prix | Volume |
|---|---|---|
| Free | 0 USD | 3 000 emails/mois, 100/jour |
| Pro | 20 USD/mois | 50 000 emails/mois, no daily cap |
| Scale | 90 USD/mois | 100 000 emails/mois |

Estimation V1 IOX :
- Phase bêta (~50 sellers, 100 buyers) : ~20 emails/jour transactionnels (RFQ create, qualify, quote, won/lost). **Free tier OK**.
- Phase post-launch (~500 sellers, 5000 buyers) : ~500 emails/jour. **Pro plan requis**.

---

## 8. Monitoring post-bascule

- Dashboard Resend → onglet "Logs" : delivered/bounced/complained.
- Backend admin `/admin/notif-email/logs` : audit trail interne (template_id, recipient, status, provider_message_id, created_at).
- Bounce ≥ 5% → DNS à vérifier ou adresses sources sales.
- Complaint ≥ 0.1% → contenu mal perçu (vérifier copywriting).

---

## 9. Sécurité

- `RESEND_API_KEY` : **JAMAIS** dans le repo. Stocker dans `.env` VPS (root-only).
- Rotation recommandée tous les 6 mois (regenerate side Resend dashboard).
- Webhook Resend pour suivi delivered/bounced : V2 (chantier RESEND-WEBHOOK séparé).

---

## 10. Liens

- Resend docs : https://resend.com/docs
- DKIM checker : https://mxtoolbox.com/dkim.aspx
- SPF checker : https://www.kitterman.com/spf/validate.html
- DMARC analyzer : https://dmarc.postmarkapp.com/
