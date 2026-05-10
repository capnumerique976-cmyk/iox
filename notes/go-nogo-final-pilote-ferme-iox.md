# Go / No-Go Final — Pilote Fermé IOX

**Version :** M100 / Mai 2026
**Date de décision :** 2026-05-11
**Branche :** `main` — commit `18ba075`
**Auteur :** Équipe IOX

---

## DÉCISION FINALE — M78 à M100

| Dimension | Décision | Condition |
|---|---|---|
| GO démo investisseur | ✅ GO INCONDITIONNEL | Code prêt, seed demo opérationnel |
| GO pilote fermé (code) | ✅ GO | Tests verts, build OK, PWA installable, pages légales |
| GO pilote fermé (infra) | ⚠️ CONDITIONNEL | VPS + SSL + backup testés + monitoring minimal |
| GO production publique | ❌ NO-GO | RGPD final + Stripe live + monitoring + juriste |

---

## CE QUI EST PRÊT

Les éléments suivants sont implémentés, testés et fonctionnels au commit `18ba075` :

1. ✅ Authentification JWT sécurisée (access token, refresh token, rotation, révocation, rate limiting)
2. ✅ Gestion des rôles (Admin, Coordinator, Seller, Buyer) — contrôle d'accès complet sur tous les endpoints
3. ✅ Onboarding vendeur step-by-step avec KYC Stripe Connect guidé
4. ✅ Catalogue produits avec recherche full-text MeiliSearch (filtres, tri, pagination)
5. ✅ Marketplace publique accessible sans authentification
6. ✅ RFQ (Request for Quotation) complet — création, réponse, négociation, statuts, expiration automatique
7. ✅ Messagerie intégrée par thread de demande de devis (acheteur / vendeur)
8. ✅ Paiements Stripe Connect (mode test) — webhooks, transferts vendeurs, split commission
9. ✅ Facturation PDF automatique à chaque paiement confirmé
10. ✅ Documents conformité et traçabilité — upload, validation admin, rejet avec motif
11. ✅ Notifications email transactionnelles (BullMQ + SMTP) avec retry automatique
12. ✅ Fonctionnalité d'unsubscribe email conforme RGPD
13. ✅ Audit logs de toutes les actions sensibles
14. ✅ Dashboard admin complet (KPIs, compliance, review queue, utilisateurs, vendeurs, RFQ)
15. ✅ Monitoring file d'attente via Bull Board (`/admin/queue`)
16. ✅ Documentation API Swagger interactive (`/api/docs`)
17. ✅ Seed demo complet (données réalistes pour présentation investisseur)
18. ✅ PWA installable — manifest.json, icônes multi-résolutions, Apple Touch Icon
19. ✅ Pages légales — CGU (`/legal/terms`), politique de confidentialité (`/legal/privacy`), mentions légales (`/legal/mentions-legales`)
20. ✅ Scripts de backup PostgreSQL automatisés (scripts prêts, cron à activer sur VPS)
21. ✅ Scripts de smoke tests post-déploiement
22. ✅ Guides utilisateurs (acheteur, vendeur, administrateur)
23. ✅ 1016 tests backend passants — 508 tests frontend passants — 0 erreur TypeScript
24. ✅ Build de production OK (NestJS + Next.js 14)
25. ✅ Documentation opérationnelle complète (deployment guide, backup runbook, admin runbook, kit terrain)

---

## CE QUI BLOQUE LA PRODUCTION PUBLIQUE

Ces éléments sont des prérequis non négociables avant toute ouverture publique. Ils ne bloquent pas le pilote fermé (accès sur invitation uniquement).

1. ❌ Stripe en mode test — aucun paiement réel ne peut être traité
2. ❌ VPS de production non provisionné — aucun déploiement possible
3. ❌ Domaine officiel non acheté — emails non fiables (SPF/DKIM impossibles sans domaine)
4. ❌ SSL non configuré — connexions non chiffrées inacceptables en production
5. ❌ RGPD incomplet — champs `[À compléter]` dans les trois documents légaux non renseignés
6. ❌ DPO non désigné — obligation légale RGPD non satisfaite
7. ❌ Monitoring Sentry non configuré — incidents non détectés côté applicatif
8. ❌ UptimeRobot non configuré — downtime non détecté
9. ❌ Backup cron non actif sur VPS — risque de perte de données en cas d'incident
10. ❌ CGU et RGPD non validés juridiquement — risque légal en cas de litige utilisateur

---

## ACTIONS MANUELLES REQUISES

Ces 11 actions ne peuvent pas être automatisées. Elles requièrent une intervention humaine avant le déploiement pilote.

1. **Louer un VPS** — Ubuntu 22.04 LTS, 4 vCPU, 8 Go RAM, 100 Go SSD (OVH, Scaleway ou Hetzner recommandés). Budget estimé : 15 à 40 €/mois.
2. **Acheter un nom de domaine** — `iox.re`, `iox.ma` ou `iox.yt`. Budget : 10 à 30 €/an.
3. **Configurer les enregistrements DNS** — pointer le domaine vers l'IP publique du VPS (enregistrements A, AAAA, MX pour les emails).
4. **Installer et configurer SSL** — `certbot --nginx -d [domaine]` sur le VPS. Renouvellement automatique via cron.
5. **Configurer les variables d'environnement de production** — remplir le fichier `.env.production` avec les secrets réels (DATABASE_URL, REDIS_URL, STRIPE_SECRET_KEY live, SMTP credentials, MINIO). Ne jamais committer ce fichier.
6. **Appliquer les migrations Prisma** — `cd apps/backend && npx prisma migrate deploy` après chaque déploiement.
7. **Activer le backup cron sur le VPS** — configurer `crontab -e` avec le script `backup-postgres.sh` existant. Tester une restauration complète avant le premier onboarding.
8. **Créer le webhook Stripe production** — depuis le dashboard Stripe, créer un endpoint `https://[domaine]/api/stripe/webhook` avec tous les événements requis. Copier la clé `STRIPE_WEBHOOK_SECRET` dans `.env.production`.
9. **Configurer UptimeRobot** — moniteur HTTP sur `https://[domaine]/api/health`. Alertes email et SMS.
10. **Remplir les informations légales** — remplacer tous les champs `[À compléter]` dans les CGU, la politique de confidentialité et les mentions légales (SIREN, adresse siège, coordonnées DPO, email de contact).
11. **Faire valider les documents légaux par un juriste** — spécialiste droit numérique et RGPD. Budget estimé : 500 à 2000 €. Obligatoire avant production publique.

---

## RISQUES RESTANTS

| Risque | Criticité | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| VPS non provisionné avant démarrage pilote | Critique | Certaine si non planifiée | Total — pilote impossible | Priorité absolue, délai 1-2 jours |
| Stripe mode test en production publique | Critique | Faible si checklist suivie | Fraude / plainte | Checklist activation live obligatoire |
| RGPD non finalisé lors d'une plainte utilisateur | Haute | Faible (pilote fermé) | Amende CNIL | Finaliser avant production publique |
| Incident applicatif sans monitoring | Haute | Possible | Downtime non détecté | Configurer Sentry + UptimeRobot dès J+1 |
| Non-adoption terrain des coopératives | Stratégique | Possible | Échec pilote | Formations courtes, support WhatsApp réactif |
| Perte de données sans backup actif | Haute | Faible si backup configuré | Irréversible | Activer et tester backup avant pilote |
| Problème de délivrabilité des emails transactionnels | Moyenne | Possible | Blocage du flux RFQ | Configurer SPF, DKIM, DMARC sur le domaine |
| Connectivité réseau insuffisante à Mayotte | Opérationnel | Possible | Expérience dégradée | Optimiser les temps de chargement, prévoir mode offline (backlog T1) |

---

## CHECKLIST FINALE — 20 ITEMS

### Infrastructure (à compléter avant pilote)

- ☐ VPS Ubuntu 22.04 provisionné et accessible en SSH
- ☐ Nom de domaine acheté et DNS configuré vers IP VPS
- ☐ SSL Certbot configuré, renouvelé automatiquement
- ☐ Fichier `.env.production` rempli avec secrets réels (non commité)
- ☐ Migrations Prisma appliquées (`npx prisma migrate deploy`)
- ☐ Backup cron actif — restauration complète testée
- ☐ UptimeRobot configuré avec alertes email et SMS
- ☐ Sentry configuré (backend + frontend)

### Paiements (avant production publique uniquement)

- ☐ Compte Stripe Business vérifié
- ☐ Clés Stripe live configurées dans `.env.production`
- ☐ Webhook Stripe production configuré et testé
- ☐ Transaction test live réalisée (1 €)

### Légal (avant production publique uniquement)

- ☐ Champs `[À compléter]` renseignés dans CGU, politique de confidentialité, mentions légales
- ☐ DPO désigné et coordonnées publiées sur la politique de confidentialité
- ☐ CGU et RGPD validés par un juriste spécialisé

### Pilote terrain

- ✅ Guides utilisateurs (acheteur, vendeur, admin) rédigés
- ✅ Kit pilote terrain complet (formation 30 min, checklist RDV coopérative)
- ✅ Scripts de smoke tests prêts
- ☐ 5 coopératives contactées, invitations envoyées
- ☐ 10 acheteurs B2B contactés, invitations envoyées

---

## RÉSUMÉ M78 À M100

| Milestone | Commit | Statut | Description |
|---|---|---|---|
| M78 | `18ba075` | ✅ | Pages légales (CGU, politique de confidentialité, mentions légales) |
| M79 | `159fdbf` | ✅ | Sécurité P0 documenté (déjà implémenté M76 — headers, rate limiting, CORS strict) |
| M80 | — | ✅ | Guide de déploiement VPS pilote |
| M81 | — | ✅ | Runbook backup et restauration |
| M82 | — | ✅ | Monitoring pilote (configuration Sentry + UptimeRobot) |
| M83 | — | ✅ | Script smoke tests post-déploiement |
| M84 | — | ✅ | RGPD — droits utilisateurs (procédures accès, rectification, suppression) |
| M85 | — | ✅ | Stripe live — checklist d'activation complète |
| M86 | — | ✅ | Délivrabilité email (SPF, DKIM, DMARC, warm-up) |
| M87 | — | ✅ | Kit pilote terrain (checklist RDV coopérative, script formation) |
| M88 | — | ✅ | KPIs pilote (tableau de bord, métriques cibles, fréquence de suivi) |
| M89 | — | ✅ | Performance readiness (Core Web Vitals, optimisations mobile) |
| M90 | — | ✅ | Accessibilité mobile (WCAG AA, tests terrain) |
| M91 | — | ✅ | Runbook exploitation admin (guide quotidien administrateur plateforme) |
| M92 | — | ✅ | Import / export pilote (templates CSV, requêtes SQL, procédures) |
| M93 | — | ✅ | Qualité des données (validation, procédures nettoyage, règles intégrité) |
| M94 | — | ✅ | Release notes pilot-v0.1.0 |
| M95 | — | ✅ | Package investisseur (deck, FAQ, script de démonstration) |
| M96 | — | ✅ | Formation terrain (guides 30 min acheteur et vendeur) |
| M97 | — | ✅ | Backlog post-pilote (priorisé par trimestre) |
| M98 | — | ✅ | Synthèse exécutive pré-pilote |
| M99 | — | ✅ | Documents de pilotage (plan terrain, checklist RDV, KPIs) |
| M100 | — | ✅ | Go / No-Go final — présent document |

---

## RECOMMANDATION FINALE

**GO pilote fermé** après provisionnement de l'infrastructure (estimé 2 à 3 semaines). Le code est complet, testé et déployable. Aucun développement supplémentaire n'est requis pour lancer le pilote terrain.

**NO-GO production publique** dans l'état actuel. La production publique nécessite : RGPD finalisé et validé par juriste, activation Stripe live, monitoring complet opérationnel, et domaine officiel avec délivrabilité email configurée. Ces éléments sont estimés à 4 à 8 semaines post-validation pilote.

---

*Document rédigé : M100 — 2026-05-11 — IOX Marketplace B2B Agricole — Océan Indien*
