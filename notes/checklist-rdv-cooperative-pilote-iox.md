# Checklist RDV — Première Coopérative Pilote IOX

**Version :** M96 / Mai 2026  
**Usage :** À imprimer ou garder sur téléphone avant et pendant le rendez-vous terrain

---

## AVANT LE RDV (J-3)

- [ ] Préparer un compte vendeur test (email dédié, mot de passe simple à retenir)
- [ ] Vérifier que le seed démo fonctionne (`pnpm seed:demo` → pas d'erreurs)
- [ ] Tester le flow complet : création produit → RFQ → paiement test
  - Créer un produit fictif (ex : vanille de Mayotte, 50 kg)
  - Simuler une demande de devis depuis un compte acheteur test
  - Répondre à la demande, accepter, simuler paiement Stripe test
  - Vérifier la facture PDF générée
- [ ] Préparer slides ou démo live (15 min maximum)
  - Contexte IOX en 2 slides
  - Flow démo en 3 slides ou capture écran
  - Prochaines étapes en 1 slide
- [ ] Vérifier la connexion internet disponible au lieu du RDV
  - Tester débit (minimum 5 Mbps recommandé)
  - Prévoir partage de connexion 4G si réseau local incertain
- [ ] Imprimer le guide vendeur si nécessaire (`notes/guide-vendeur-iox.md`)
- [ ] Préparer la formation 30 min (voir `notes/formation-30min-vendeur-iox.md`)

---

## DOCUMENTS À DEMANDER À LA COOPÉRATIVE

Ces documents sont nécessaires pour l'onboarding officiel. Préciser que certains sont requis par Stripe (KYC) et la réglementation.

- [ ] **Statuts de la coopérative** (PDF ou copie papier)
- [ ] **Extrait Kbis ou document équivalent** (SIRET, numéro RNA, ou équivalent local Mayotte)
- [ ] **IBAN** pour recevoir les paiements (RIB de la coopérative)
- [ ] **Coordonnées du DG / référent commercial** (nom, prénom, email, téléphone direct)
- [ ] **Catalogue produits existant** (Excel, PDF, document papier — tout format accepté)
- [ ] **Photos produits** si disponibles (JPEG, PNG — même photos de smartphone)

> **Note :** Les documents KYC Stripe (pièce d'identité dirigeant, justificatif de domicile) seront demandés lors de l'onboarding en ligne. Ne pas les demander en papier lors du RDV.

---

## PENDANT LE RDV

### Accroche (5 min)
- Présenter IOX en 5 minutes maximum :
  - Marketplace B2B, focalisé sur l'océan Indien (Mayotte, La Réunion, Comores, Madagascar)
  - Objectif : connecter les coopératives agricoles locales avec des acheteurs B2B professionnels (grossistes, restaurateurs, distributeurs)
  - Valeur ajoutée : traçabilité produit, conformité export, paiements sécurisés, demande de devis structurée

### Démonstration live (10 min)
- [ ] Créer un produit (nommer avec un produit de la coopérative si possible)
- [ ] Simuler la réception d'une demande de devis (RFQ)
- [ ] Répondre à la demande depuis le tableau de bord vendeur
- [ ] Montrer le processus de paiement (Stripe — préciser mode test pour le pilote)
- [ ] Afficher la facture PDF générée automatiquement

### Points à expliquer
- [ ] Expliquer l'onboarding Stripe (KYC nécessaire — vérification identité dirigeant, IBAN)
- [ ] Montrer le tableau de bord vendeur (produits, demandes en cours, paiements reçus)
- [ ] Mentionner la PWA : "vous pouvez installer l'application sur votre smartphone"
- [ ] Préciser que le pilote est fermé (invitation uniquement, pas de lien public)

### Écoute
- [ ] Répondre aux questions sans survendre
- [ ] Recueillir la liste des produits à saisir (noter ou photographier leur catalogue)
- [ ] Identifier le référent quotidien (qui sera derrière le clavier)

---

## QUESTIONS À POSER

Ces questions permettent de qualifier la coopérative et d'adapter l'accompagnement.

1. **Combien de produits avez-vous à proposer ?**
   *(Objectif : savoir si import CSV sera nécessaire, ou saisie manuelle suffisante)*

2. **Quels pays ou types d'acheteurs vous intéressent ?**
   *(La Réunion ? Métropole ? Export hors UE ? — utile pour cibler les acheteurs pilotes)*

3. **Avez-vous déjà vendu à l'export ? Quelles difficultés avez-vous rencontrées ?**
   *(Comprendre les points de douleur : logistique, conformité sanitaire, paiement, barrière langue)*

4. **Qui gérera le compte au quotidien ?**
   *(Identifier la personne à former — niveau numérique, disponibilité)*

5. **Avez-vous un smartphone Android ou iPhone ?**
   *(Pour la PWA — Android Chrome recommandé pour l'installation)*

6. **Quel est votre débit internet au bureau / à l'entrepôt ?**
   *(Fibre, ADSL, 4G ? — pour anticiper les problèmes de chargement photos)*

---

## ENGAGEMENT ATTENDU DU PILOTE

À présenter clairement comme des engagements mutuels (IOX accompagne, la coopérative s'engage).

**La coopérative s'engage à :**
- [ ] Publier **3 produits minimum** dans les **2 semaines** suivant l'onboarding
- [ ] Répondre aux demandes de devis (RFQ) **dans les 48h**
- [ ] Participer à **1 session de suivi par semaine** (30 min, visio ou sur place)
- [ ] Remonter les bugs ou problèmes via **WhatsApp** (numéro à communiquer)

**IOX s'engage à :**
- Accompagner l'onboarding complet (formation + support)
- Corriger les bugs remontés en priorité
- Fournir un rapport hebdomadaire d'activité (vues, demandes reçues, conversions)
- Ne pas facturer de commission pendant la phase pilote

---

## PROCHAINE ÉTAPE (à confirmer avant de partir)

- [ ] **Envoyer l'invitation par email** sous 24h (email avec lien d'activation compte)
- [ ] **Planifier la session de formation 30 min** dans la semaine
  - Date : _______________
  - Format : ☐ Sur place   ☐ Visio (WhatsApp / Google Meet)
  - Référent coopérative : _______________

---

## NOTES RDV

> *(Zone de prise de notes pendant le rendez-vous)*

**Coopérative :** _______________  
**Date RDV :** _______________  
**Lieu :** _______________  
**Interlocuteurs présents :** _______________  

**Produits identifiés :**
- 
- 
- 

**Questions / objections soulevées :**
- 
- 

**Actions post-RDV :**
- [ ] _______________
- [ ] _______________
