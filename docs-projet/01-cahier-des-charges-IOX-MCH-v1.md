IOX
Cahier des charges fonctionnel et technique
Version 1.0 – document de cadrage pour le développement

# Sommaire

1. Contexte et finalité de l’application
2. Vision produit et objectifs
3. Périmètre fonctionnel
4. Étude fonctionnelle détaillée
5. Règles métier et workflows
6. Rôles, habilitations et gouvernance
7. Données et modélisation
8. Exigences non fonctionnelles
9. Architecture cible et intégrations
10. Roadmap, livrables et critères de recette
11. Risques, hypothèses et recommandations

# 1. Contexte et finalité de l’application

Le projet MAYOTTE CONNECT HUB (MCH) vise à structurer une filière économique régionale ancrée à Mayotte, au service des agriculteurs, artisans et transformateurs du territoire. Le projet combine professionnalisation des acteurs, transformation locale, mutualisation logistique et création de débouchés durables. Il prévoit l’accompagnement de 50 structures par an, une montée en charge de la logistique jusqu’à 12 000 kg par an et une articulation entre ingénierie, prospection commerciale et organisation des flux.
Dans ce cadre, l’application IOX ne doit pas être pensée comme un simple outil de prospection commerciale. Elle doit devenir la plateforme métier de pilotage de la chaîne de valeur MCH : sélection des bénéficiaires, conformité, traçabilité, transformation, mise en marché, logistique, suivi commercial et reporting.
• Préparer les acteurs : diagnostiquer, qualifier, former et accompagner les bénéficiaires.
• Structurer les filières : organiser les flux, les documents, les rôles et les validations.
• Sécuriser la mise en marché : ne rendre commercialisables que les produits conformes, traçables et validés.
• Transformer les actions commerciales en commandes et revenus durables : prospects, offres, contrats, livraisons, suivi.
• Produire un reporting fiable pour le COPIL, les partenaires institutionnels et les financeurs.

## 1.1 Problème à résoudre

Aujourd’hui, les filières ciblées cumulent plusieurs fragilités : informations dispersées, faible traçabilité des étapes, manque de visibilité sur l’état de conformité d’un produit, difficulté à relier un diagnostic de bénéficiaire à un produit et à un lot, faible outillage pour le suivi logistique et commercial, et insuffisance de tableaux de bord consolidés.

## 1.2 Finalité opérationnelle d’IOX

IOX doit fournir un système d’information unique pour gérer l’ensemble du cycle métier, du producteur ou artisan bénéficiaire jusqu’à la commande et au reporting, en intégrant les exigences réglementaires, documentaires et de gouvernance du projet.

# 2. Vision produit et objectifs

## 2.1 Vision produit

IOX est une plateforme web sécurisée de pilotage de filière. Elle sert à centraliser les bénéficiaires, les produits, les fournisseurs, les contrats d’approvisionnement, les documents réglementaires, les opérations de transformation, les lots, les validations de mise en marché, les prospects, les expéditions et les indicateurs du projet.

## 2.2 Objectifs métiers

• Accompagner 50 structures bénéficiaires par an avec un suivi individualisé.
• Sécuriser l’approvisionnement via des conventions et une gestion documentaire des flux amont.
• Piloter la transformation, le conditionnement et le stockage local à Mayotte.
• Assurer la traçabilité bout en bout des matières premières et des produits finis.
• Bloquer la mise en marché des produits non conformes ou incomplets.
• Industrialiser le suivi commercial, la gestion des opportunités et les relances.
• Produire des tableaux de bord d’avancement, de performance et de conformité.

## 2.3 Objectifs fonctionnels

• Gérer plusieurs types d’utilisateurs et des habilitations fines.
• Fournir un back-office métier complet et un portail bénéficiaire.
• Permettre la recherche et la consultation rapide de tous les dossiers et lots.
• Centraliser les pièces justificatives et l’historique des décisions.
• Rendre possible l’auditabilité de chaque opération et de chaque validation.
• Permettre l’export de rapports, registres et tableaux de bord.

# 3. Périmètre fonctionnel

## 3.1 Périmètre couvert

• Gestion des bénéficiaires : inscription, qualification, diagnostic, plan d’accompagnement, suivi des actions.
• Gestion des partenaires d’approvisionnement : coopératives, fournisseurs, contrats, capacités, documents.
• Gestion des produits : fiches techniques, packaging, origine, conformité, statut commercial.
• Gestion de la transformation : réception matière, opérations, contrôles, lots, stockage.
• Gestion réglementaire : formalités d’entrée, conformité documentaire, étiquetage, responsabilités, incidents.
• Gestion de la mise en marché : validation, blocage, réserves, visa, publication au CRM commercial.
• Gestion commerciale : acheteurs, opportunités, pipeline, devis, contrats, commandes, réassorts.
• Gestion logistique : préparation d’expédition, stock, groupage, transport, réception, incidents de livraison.
• Pilotage et reporting : KPIs, tableaux de bord, exports financeurs, audit et supervision.

## 3.2 Hors périmètre initial (MVP)

• Marketplace publique complète ouverte aux paiements en ligne.
• Gestion comptable générale ou ERP financier complet.
• Gestion RH complète.
• Intelligence artificielle avancée de prévision ou recommandation acheteurs dès le premier lot.
• Application mobile native hors back-office responsive.

## 3.3 Principes directeurs

• Unicité de l’information : une donnée saisie une seule fois, réutilisée dans les autres modules.
• Traçabilité totale : tout lot, document, décision et action doivent être historisés.
• Décision de mise en marché obligatoire avant ouverture à la vente.
• Séparation claire entre fonctions de pilotage stratégique, exécution opérationnelle, conformité et commerce.
• Conception modulaire pour permettre une montée en puissance progressive.

# 4. Étude fonctionnelle détaillée

## 4.1 Module bénéficiaires et diagnostic

• Créer une fiche bénéficiaire : entreprise, artisan, producteur, groupement, transformateur.
• Renseigner identité, localisation, catégorie, capacités, certifications, contacts et statut administratif.
• Enregistrer un diagnostic initial : maturité, freins, besoins, objectifs, risques, priorités.
• Construire un plan d’accompagnement individualisé et suivre les actions engagées.
• Affecter un référent et historiser les rendez-vous, comptes rendus et pièces jointes.
• Mesurer l’avancement par bénéficiaire : diagnostic réalisé, formation suivie, produit prêt, offre validée, etc.

## 4.2 Module fournisseurs et approvisionnement

• Créer des fiches coopératives et fournisseurs partenaires.
• Enregistrer conventions, contrats, volumes, qualité attendue, calendrier, responsabilités, modalités de paiement.
• Associer à chaque matière première les documents requis à l’entrée et au transport.
• Suivre les expéditions amont, les réceptions, les écarts de quantité/qualité et les incidents.
• Bloquer un flux amont si les documents obligatoires sont absents ou expirés.

## 4.3 Module produits et fiches techniques

• Créer une fiche produit ou gamme : nom commercial, catégorie, description, origine matière première, lieu de transformation, conditionnement, capacité de production.
• Associer au produit ses pièces justificatives : fiches techniques, éléments d’étiquetage, visuels, documents de conformité.
• Gérer plusieurs versions d’un même produit et de son packaging.
• Définir un statut produit : brouillon, en préparation, prêt à validation, conforme, conforme sous réserve, bloqué, archivé.

## 4.4 Module transformation, qualité et lots

• Enregistrer la réception de matières premières par lot avec quantité, date, origine, fournisseur, contrôles d’entrée.
• Enregistrer les opérations de transformation et de conditionnement à Mayotte.
• Créer automatiquement les lots de fabrication et lier lot entrant / opération / lot produit fini.
• Suivre les contrôles qualité, non-conformités, pertes, rebuts, reprises et destructions éventuelles.
• Gérer les emplacements de stockage et la disponibilité des lots.

## 4.5 Module conformité réglementaire

• Vérifier les formalités d’entrée à Mayotte : documents douaniers, sanitaires, phytosanitaires, documentaires selon le type de produit.
• Gérer la check-list de conformité documentaire et les échéances des pièces.
• Vérifier l’étiquetage, l’origine, les responsabilités, la traçabilité et la préparation commerciale.
• Historiser toutes les validations, réserves et corrections demandées.

## 4.6 Module décision de mise en marché

• Appliquer la règle métier centrale : un produit ou lot ne peut être commercialisé que s’il est conforme.
• Présenter au valideur une check-list complète avant décision.
• Produire une décision : Conforme / Conforme sous réserve / Non conforme - blocage.
• Enregistrer date, nom du valideur, fonction, signature/visa numérique, commentaires et pièces de preuve.
• Empêcher toute ouverture commerciale d’un lot non validé.
• Permettre la levée d’un blocage après correction et nouvelle validation.

## 4.7 Module CRM commercial et acheteurs

• Créer des fiches acheteurs, importateurs, distributeurs, partenaires B2B, catégories de marché.
• Gérer les leads, les opportunités, le scoring, les étapes du pipeline, les relances et tâches.
• Associer une opportunité à un ou plusieurs produits validés et réellement disponibles.
• Suivre devis, offres, contrats, commandes, quantités, échéances et historique des échanges.
• Mesurer la conversion : lead → opportunité → commande → réassort.

## 4.8 Module logistique et expédition

• Préparer les expéditions par lot, client, date et destination.
• Gérer le groupage, les stocks tampons, les mouvements, les sorties et réassorts.
• Suivre les incidents de transport, pertes, ruptures, retards et litiges.
• Produire les documents logistiques et états de livraison.
• Rattacher chaque expédition à ses lots, ses commandes et ses conditions de transport.

## 4.9 Module incidents, réclamations et blocages

• Déclarer tout incident qualité, logistique, documentaire ou commercial.
• Classer l’incident par gravité et impact.
• Déclencher des mesures : information, correction, blocage, retrait, rappel, action corrective.
• Affecter un responsable et une échéance, puis suivre la résolution.
• Historiser les causes, actions, validations et clôture.

## 4.10 Module reporting et tableaux de bord

• Afficher les indicateurs d’avancement du projet : nombre de bénéficiaires, diagnostics, formations, produits validés, volumes traités, prospects, commandes, incidents.
• Produire les indicateurs demandés par les financeurs et le COPIL.
• Exporter en PDF/Excel/CSV des tableaux de bord et registres.
• Permettre une vue par période, par filière, par bénéficiaire, par produit, par lot et par marché.

# 5. Règles métier et workflows

## 5.1 Workflow cible de bout en bout

• Étape 1 : création et qualification du bénéficiaire.
• Étape 2 : diagnostic initial et plan d’accompagnement.
• Étape 3 : création de la fiche produit et des pièces de conformité.
• Étape 4 : formalisation du partenariat d’approvisionnement et réception des matières.
• Étape 5 : transformation et conditionnement à Mayotte, création des lots.
• Étape 6 : vérification conformité + traçabilité + étiquetage + responsabilités.
• Étape 7 : décision de mise en marché.
• Étape 8 : ouverture du produit ou lot au CRM commercial.
• Étape 9 : prospection, offres, commandes, expéditions, réassorts.
• Étape 10 : reporting, incidents, audits et amélioration continue.

## 5.2 Règle métier critique de mise en marché

Le produit ou le lot peut être commercialisé uniquement si les conditions suivantes sont remplies :
• le flux d’approvisionnement est contractuellement sécurisé ;
• les formalités d’entrée à Mayotte sont conformes ;
• la transformation et le conditionnement ont été réalisés dans un cadre maîtrisé ;
• l’étiquetage a été validé ;
• le lot est traçable ;
• les responsabilités sont clairement attribuées ;
• la procédure de gestion des incidents est opérationnelle.
La décision de mise en marché comporte obligatoirement : le statut de décision (Conforme / Conforme sous réserve / Non conforme – blocage), la date, le nom du valideur, sa fonction, sa signature ou son visa numérique, les commentaires et, le cas échéant, les réserves à lever.

## 5.3 Règles supplémentaires

• Un lot bloqué ne peut être rattaché à aucune opportunité commerciale active.
• Un produit ne peut être publié au module CRM que si au moins un lot disponible est validé.
• Un document expiré fait repasser le produit ou lot en statut à revalider si ce document conditionne la conformité.
• Chaque modification sensible d’une fiche produit, d’une étiquette ou d’un contrat d’approvisionnement doit être historisée.
• Toute non-conformité majeure déclenche un incident et peut entraîner un blocage automatique.
• Toute expédition doit être rattachée à une commande et à des lots connus.

# 6. Rôles, habilitations et gouvernance

L’application doit refléter la gouvernance du projet et la séparation des responsabilités entre pilotage, opération, conformité et commerce.

# 7. Données et modélisation

## 7.1 Entités métiers principales

Le modèle de données doit au minimum couvrir les entités suivantes : Beneficiary, Company, SupplierCooperative, SupplyContract, Product, ProductVersion, IncomingBatch, TransformationOperation, OutputBatch, PackagingSpec, ComplianceDocument, LabelValidation, MarketReleaseDecision, Buyer, Lead, Opportunity, Order, Shipment, Incident, StorageLocation, User, Role, AuditLog, KPIReport.

## 7.2 Relations structurantes

• Un bénéficiaire peut avoir plusieurs produits.
• Un produit peut avoir plusieurs versions et plusieurs lots.
• Un lot entrant peut alimenter une ou plusieurs opérations de transformation.
• Une opération de transformation peut produire un ou plusieurs lots finis.
• Un lot fini peut être lié à plusieurs documents de conformité et à une décision de mise en marché.
• Une opportunité commerciale peut associer un ou plusieurs produits, mais seulement des lots validés peuvent être réservés à la commande.
• Une expédition est liée à une commande, à des lots et à un destinataire.
• Un incident peut concerner un produit, un lot, une expédition, un document ou un contrat.

## 7.3 Données minimales par objet

• Produit : code, nom, catégorie, description, origine matière première, lieu de transformation, packaging, statut, photos, pièces jointes.
• Lot entrant : fournisseur, origine, date, quantité, contrôles d’entrée, documents, statut.
• Lot fini : référence, date, quantité produite, stockage, statut, décision de mise en marché.
• Décision de mise en marché : statut, date, valideur, fonction, signature, réserves, pièces et journal d’historique.
• Acheteur : type, marché, zone géographique, contact, historique, scoring, état des opportunités.

# 8. Exigences non fonctionnelles

## 8.1 Sécurité

• Authentification forte et politique de mot de passe robuste.
• Gestion des rôles et habilitations par profil et par module.
• Journalisation des connexions, des validations et des actions sensibles.
• Chiffrement des échanges HTTPS/TLS, sauvegardes chiffrées, contrôle des accès.
• Possibilité de double facteur pour les profils à pouvoir de validation.

## 8.2 Traçabilité et auditabilité

• Conserver l’historique des modifications de données sensibles.
• Conserver les pièces justificatives et leurs versions.
• Permettre l’export des journaux d’activité et d’audit.

## 8.3 Performance et disponibilité

• Temps de réponse cible inférieur à 3 secondes sur les écrans métier courants.
• Application responsive et utilisable avec une connexion moyenne.
• Capacité à gérer simultanément plusieurs dizaines d’utilisateurs back-office.
• Sauvegardes quotidiennes et plan minimal de reprise.

## 8.4 Ergonomie

• Interface claire orientée tâches et états de dossier.
• Recherche multi-critères, filtres et vues de synthèse.
• Alerte visuelle sur documents manquants, lots bloqués, échéances et incidents.
• Parcours simples pour les utilisateurs non techniques.

## 8.5 Conformité données personnelles

• Cartographie des données personnelles traitées et base légale de traitement.
• Durées de conservation définies par type de donnée.
• Gestion des droits d’accès et de suppression lorsque pertinent.
• Mentions d’information et politique de confidentialité.

# 9. Architecture cible et intégrations

## 9.1 Principes techniques

Le choix technique doit privilégier une architecture web modulaire, exposant des API internes et capable de séparer front-office, back-office, services métier et reporting.
• Frontend web moderne pour back-office et portail utilisateurs.
• Backend applicatif avec API sécurisée.
• Base de données relationnelle principale pour données métier et audit.
• Stockage de documents et médias avec contrôle d’accès.
• Mécanisme de tâches planifiées pour alertes, notifications, exports et rappels.

## 9.2 Intégrations à prévoir

• Messagerie email pour notifications et relances.
• Signature ou visa numérique pour validations critiques.
• Exports Excel/PDF/CSV pour financeurs et audits.
• Éventuelle intégration future avec site vitrine, marketplace, BI ou outils logistiques.

## 9.3 Recommandation d’urbanisation

• MVP centré sur cœur métier, conformité, lots et reporting.
• Module commercial branché ensuite sur les produits et lots validés.
• Couche BI / tableaux de bord avancés dans une troisième phase.

# 10. Roadmap, livrables et critères de recette

## 10.1 Phasage recommandé

## 10.2 Livrables attendus du prestataire

• Spécifications fonctionnelles détaillées validées.
• Maquettes d’écrans et parcours utilisateurs.
• Spécifications techniques et modèle de données détaillé.
• Développement, tests, déploiement, documentation utilisateur et administrateur.
• Plan de reprise, plan de sauvegarde et guide d’exploitation.
• Cahier de recette et procès-verbal de recette.

## 10.3 Critères de recette

• Tous les rôles et droits sont conformes au cahier des charges.
• Le workflow de mise en marché fonctionne sans contournement possible.
• La traçabilité lot entrant → transformation → lot fini → commande → expédition est démontrée.
• Les exports et tableaux de bord attendus sont disponibles.
• Les journaux d’audit et les validations sont consultables.
• Les performances et la sécurité sont conformes aux exigences minimales.

# 11. Risques, hypothèses et recommandations

## 11.1 Risques principaux

• Créer une application trop centrée sur la prospection et pas assez sur la conformité et la traçabilité.
• Sous-estimer la complexité des validations métier et du multi-rôle.
• Vouloir intégrer trop tôt des fonctions d’intelligence avancée au détriment du socle métier.
• Ne pas formaliser les référentiels, statuts et pièces obligatoires avant le développement.
• Concevoir le système sans logique de reporting financeurs et audit.

## 11.2 Hypothèses de réussite

• Une maîtrise d’ouvrage métier disponible pour arbitrer les règles.
• Des référentiels produits, documents et statuts validés avant développement.
• Une politique de gouvernance claire sur la validation de mise en marché.
• Une stratégie documentaire et de traçabilité définie dès la phase de conception.

## 11.3 Recommandation finale

IOX doit être développé comme une plateforme de structuration, de conformité, de traçabilité, de logistique et de mise en marché au service des filières mahoraises. Le module CRM export est indispensable, mais il doit rester adossé au cœur métier et ne jamais permettre la commercialisation d’un produit non validé. La réussite du développement dépendra de la qualité de la modélisation des données, de la formalisation des statuts et de l’implémentation stricte des règles métier.

# Annexe A – Exigences minimales du module de décision de mise en marché

• Check-list obligatoire avant validation.
• Historique horodaté des corrections demandées.
• Blocage automatique si pièce obligatoire absente.
• Signature ou visa numérique du valideur.
• Journal de décision non modifiable, seulement versionné.
• Export PDF de la fiche de décision.

# Annexe B – Liste indicative des statuts

• Bénéficiaire : brouillon / qualifié / en accompagnement / suspendu / sorti.
• Produit : brouillon / en préparation / prêt à validation / conforme / conforme sous réserve / bloqué / archivé.
• Lot : reçu / en contrôle / transformé / prêt à validation / disponible / réservé / expédié / bloqué / détruit.
• Opportunité : identifiée / qualifiée / en négociation / offre envoyée / commande gagnée / perdue / suspendue.
• Incident : ouvert / en analyse / action en cours / sous contrôle / clôturé.

[TABLE 1]
Objet du document / Définir de façon complète le périmètre fonctionnel, les règles métier, les données, les rôles, les workflows, les exigences non fonctionnelles et les principes techniques de l’application IOX, conçue comme plateforme de pilotage du projet MAYOTTE CONNECT HUB (MCH).

[TABLE 2]
Projet support | MAYOTTE CONNECT HUB (MCH)
Porteur envisagé | ADAAM / partenaires techniques et institutionnels
Destinataires | Maîtrise d’ouvrage, développeurs, intégrateur, financeurs, partenaires
Périmètre | Application web métier + back-office + reporting
Statut | Base de travail détaillée pour consultation et développement

[TABLE 3]
Rôle | Droits principaux
Administrateur plateforme | Paramétrage, gestion des rôles, sécurité, référentiels, audit technique.
Coordinateur ADAAM | Vue transverse, arbitrage opérationnel, affectation, supervision globale.
Référent bénéficiaires | Qualification, diagnostics, accompagnement, pièces et rendez-vous.
Référent approvisionnement | Fournisseurs, contrats, expéditions amont, réceptions.
Référent transformation/qualité | Opérations de transformation, lots, qualité, conformité, étiquetage.
Valideur mise en marché | Décision formelle de conformité, réserves, blocage ou validation.
Référent logistique | Stocks, mouvements, expéditions, réassorts, incidents de livraison.
Référent commercial | Acheteurs, leads, offres, commandes, contrats, relances.
Bénéficiaire | Accès à son dossier, à ses actions, à ses produits et à certaines pièces partagées.
Partenaire institutionnel / financeur (lecture) | Consultation de tableaux de bord et rapports selon habilitation.
Auditeur | Accès en lecture aux journaux d’activité, aux lots, aux décisions et aux documents.

[TABLE 4]
Phase | Périmètre | Objectif | Livrables
Phase 1 – MVP | Bénéficiaires, produits, approvisionnement, conformité, lots, décision de mise en marché, reporting de base | Sécuriser le cœur du système et la règle de mise en marché | Back-office initial, données de référence, tableaux de bord simples
Phase 2 – Exploitation | CRM commercial, acheteurs, commandes, logistique, incidents | Transformer la conformité en débouchés et suivre les opérations | Pipeline commercial, gestion des expéditions, alertes et incidents
Phase 3 – Optimisation | Scoring, BI avancée, automatisations, portails étendus | Industrialiser le pilotage et améliorer la performance | Reporting financeurs avancé, alertes intelligentes, automatisations
