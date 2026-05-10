# Go / No-Go Final — Pilote Fermé IOX

**Version :** M100 / Mai 2026  
**Date de décision :** 11 mai 2026  
**Branche :** `main` — Commit `18ba075` (M78) et suivants  
**Auteur :** Équipe IOX

---

## DÉCISION FINALE — M78→M100

| Dimension | Décision | Condition |
|---|---|---|
| GO démo investisseur | GO | Aucune condition |
| GO pilote fermé (code) | GO | Code prêt |
| GO pilote fermé (infra) | CONDITIONNEL | VPS + SSL + backup testés |
| GO production publique | NO-GO | RGPD final + Stripe live + monitoring |

---

## CE QUI EST PRÊT

La plateforme IOX est techniquement opérationnelle. Les éléments suivants sont implémentés, testés et fonctionnels :

1. Authentification JWT sécurisée (access token + refresh token, rotation, révocation)
2. Onboarding vendeur complet avec KYC Stripe Connect (vérification identité, IBAN, documents)
3. Catalogue produits avec recherche plein texte MeiliSearch (filtres, tri, pagination)
4. RFQ (Request for Quotation) complet — création, réponse, négociation, statuts, expiration
5. Paiements Stripe Connect (test mode) — intégration complète, webhooks, transferts vendeurs
6. Facturation PDF automatique à chaque transaction confirmée
7. Documents conformité et traçabilité — upload, validation, association aux produits
8. Messagerie RFQ — thread par demande, temps réel (polling), notifications
9. Notifications email transactionnelles — via queue BullMQ, templates HTML
10. Lien de désinscription (unsubscribe) conforme RGPD
11. PWA installable — manifest, icônes, meta tags Apple/Android, splash screen
12. Pages légales déployées — CGU (`/legal/terms`), politique de confidentialité (`/legal/privacy`), mentions légales (`/legal/mentions-legales`)
13. Tests complets — 1016 tests backend (NestJS/Jest) + 508 tests frontend (Next.js/Testing Library), tous verts
14. TypeScript strict — zéro erreur de compilation (backend + frontend)
15. Build de production OK — `pnpm build` sans erreur ni warning critique
16. Scripts backup PostgreSQL — dump chiffré, upload S3/MinIO, rétention 30 jours
17. Documentation pilote — guides vendeur/acheteur, kit terrain, runbooks opérationnels
18. Sécurité P0 appliquée — S1 (injection SQL via Prisma), S2 (rate limiting), S3 (headers HTTP sécurisés)
19. Seed démo fonctionnel — données réalistes pour démonstration (coopératives, produits, RFQ, paiements)
20. Runbook exploitation admin — guide complet pour l'administration quotidienne de la plateforme

---

## CE QUI BLOQUE LA PRODUCTION PUBLIQUE

Ces éléments sont des prérequis non négociables avant toute ouverture publique. Ils ne bloquent pas le pilote fermé (invitation uniquement), mais empêchent la production publique.

| Bloquant | Impact |
|---|---|
| VPS non provisionné | Impossible de déployer quoi que ce soit |
| Domaine non acheté | Emails non fiables (SPF/DKIM), URL non brandée |
| SSL non configuré | Connexions non chiffrées — inacceptable |
| Monitoring non configuré | Incidents non détectés, pas d'alerte downtime |
| Stripe live non activé | Paiements réels impossibles |
| RGPD — champs [À compléter] non renseignés | Non-conformité RGPD |
| Backup cron non configuré sur VPS | Risque de perte de données |
| Validation juridique CGU/RGPD non faite | Risque légal |

---

## ACTIONS MANUELLES REQUISES

Ces actions ne peuvent pas être automatisées — elles nécessitent une intervention humaine.

1. **Acheter / louer un VPS** — Ubuntu 22.04, 4 vCPU, 8 GB RAM, 100 GB SSD (OVH, Scaleway, Hetzner recommandés). Budget estimé : 15-40 €/mois.
2. **Acheter un domaine** — recommandés : `iox.ma` (Maroc/symbolique océan Indien), `iox.re` (La Réunion), ou `iox.yt` (Mayotte). Budget : 10-30 €/an.
3. **Configurer DNS** — pointer le domaine vers l'IP du VPS (enregistrements A, MX pour emails).
4. **Configurer SSL Certbot** — `certbot --nginx -d iox.[domaine]` sur le VPS. Renouvellement automatique.
5. **Remplir les variables `.env` production** — secrets réels (DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY live, SMTP, MINIO...). Ne jamais committer ces valeurs.
6. **Appliquer les migrations Prisma** — `pnpm prisma migrate deploy` sur le VPS après déploiement.
7. **Configurer le backup cron** — `crontab -e` sur le VPS, script `backup-postgres.sh` existant dans `/scripts/`.
8. **Configurer UptimeRobot** — créer un moniteur HTTP sur `https://[domaine]/api/health`. Alertes email + SMS.
9. **Créer le webhook Stripe production** — dans le dashboard Stripe, créer un endpoint `https://[domaine]/api/stripe/webhook` avec les événements requis. Récupérer la clé `STRIPE_WEBHOOK_SECRET`.
10. **Remplir les informations légales** — remplacer tous les `[À compléter]` dans CGU, mentions légales, politique de confidentialité (SIREN, adresse, DPO, email de contact).
11. **Faire valider CGU et RGPD par un juriste** — prestataire externe recommandé (spécialiste droit numérique + RGPD). Budget estimé : 500-2000 €.
12. **KYC Stripe des vendeurs pilotes** — accompagner chaque coopérative dans la complétion de l'onboarding Stripe (pièce d'identité dirigeant, justificatif de domicile, IBAN).

---

## RISQUES RESTANTS

| Risque | Criticité | Action recommandée |
|---|---|---|
| VPS non provisionné | Critique | Priorité 1 — à faire avant tout déploiement |
| Domaine non acheté | Haute | Nécessaire pour emails de confiance et URL définitive |
| SSL absent | Haute | Configurer immédiatement après VPS + domaine |
| RGPD incomplet | Haute | Acceptable pilote fermé — obligatoire avant public |
| Stripe en mode test | Haute | Intentionnel pour pilote — passer live après validation |
| Monitoring absent | Moyenne | Surveiller les logs manuellement pendant le pilote |
| Backup non testé sur VPS | Moyenne | Tester une restauration complète avant pilote |
| Adoption terrain incertaine | Stratégique | Formation + support WhatsApp + suivi hebdomadaire |
| Connectivité internet Mayotte | Opérationnel | Prévoir mode dégradé / offline pour catalogue (backlog T1) |
| Barrière langue / numérique | Opérationnel | Formations 30 min terrain, guide papier imprimé |

---

## CHECKLIST FINALE AVANT PILOTE

### Infrastructure

- [ ] VPS Ubuntu 22.04 provisionné et accessible en SSH
- [ ] Domaine acheté et DNS configuré vers IP VPS
- [ ] SSL Certbot configuré et renouvelé automatiquement
- [ ] `.env.production` rempli avec secrets réels (jamais commité)
- [ ] Migrations Prisma appliquées (`migrate deploy`)
- [ ] Seeds de production appliqués (comptes admin, configuration initiale)
- [ ] Backup cron actif et testé (restauration validée)
- [ ] UptimeRobot configuré avec alerte email + SMS

### Paiements

- [ ] Compte Stripe Business vérifié (informations société complètes)
- [ ] Stripe passé en mode live (clés live dans `.env.production`)
- [ ] Webhook Stripe production configuré (`/api/stripe/webhook`)
- [ ] Test de transaction live réalisé (montant test : 1 €)

### Légal

- [ ] Champs [À compléter] renseignés dans CGU, confidentialité, mentions légales
- [ ] DPO ou référent RGPD désigné
- [ ] Registre des traitements de données complété
- [ ] CGU et politique de confidentialité validées par juriste

### Pilote terrain

- [ ] 5 coopératives contactées et invitations envoyées
- [ ] 10 acheteurs B2B contactés et invitations envoyées
- [ ] Sessions de formation 30 min planifiées pour toutes les coopératives
- [ ] Canal de support WhatsApp opérationnel
- [ ] Procédure de remontée de bugs documentée et communiquée

---

## RECOMMANDATION FINALE

**GO pilote fermé** — sous condition de provisionnement VPS et configuration SSL/backup (estimé : 2-3 semaines de travail infrastructure).

**NO-GO production publique** — jusqu'à validation RGPD complète, activation Stripe live, configuration monitoring, et achat domaine officiel. Ces éléments sont estimés à 4-8 semaines après validation terrain du pilote.

**Timeline recommandée :**
- **Semaines 1-2 :** Infrastructure (VPS, domaine, SSL, backup, déploiement)
- **Semaines 3-10 :** Pilote terrain fermé (5 coopératives + 10 acheteurs)
- **Semaines 11-12 :** Analyse résultats, décision production publique
- **Mois 4+ :** Production publique (si pilote validé)

---

*Document rédigé : M100 — Mai 2026 — IOX*
