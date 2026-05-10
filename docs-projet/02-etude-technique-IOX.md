DOSSIER D’ÉTUDE TECHNIQUE
APPLICATION IOX
Plateforme de structuration, conformité, traçabilité, logistique et mise en marché au service du programme MCH

# 1. Résumé exécutif

IOX ne doit pas être conçu comme une simple plateforme de prospection export. Le projet MCH attend un outil central capable de piloter l’accompagnement de 50 structures par an, la transformation locale à Mayotte, la traçabilité des lots, la conformité documentaire, la décision de mise en marché, la logistique mutualisée et la conversion des opportunités commerciales en commandes durables.
Le socle fonctionnel critique d’IOX est donc le suivant :
• gestion des bénéficiaires et de leur niveau de maturité ;
• gestion des produits, matières premières et fiches techniques ;
• sécurisation contractuelle et documentaire des approvisionnements ;
• réception matière, transformation, conditionnement et qualité ;
• traçabilité complète lot entrant → lot transformé → expédition → vente ;
• validation de mise en marché : Conforme / Conforme sous réserve / Non conforme ;
• stocks, logistique, incidents et réassort ;
• CRM commercial et reporting financeurs.
Le choix d’architecture recommandé pour le MVP est un monolithe modulaire web-first, documenté par API, avec séparation claire entre front, back, base de données, stockage documentaire et moteur de notifications. Ce choix maximise la vitesse de développement, réduit le risque et reste compatible avec une évolution ultérieure vers une architecture plus distribuée.

# 2. Contexte, périmètre et documents de référence

Le projet MCH a été recentré autour de la résilience économique, de la structuration des filières, de la transformation locale à Mayotte, de la mutualisation logistique et de la conquête de débouchés durables. Il prévoit l’accompagnement de 50 structures par an, la transformation à Mayotte, des partenariats d’approvisionnement avec Madagascar, ainsi qu’une montée en charge logistique jusqu’à 12 000 kg/an.
IOX doit être conçu comme la brique numérique de ce dispositif. À ce titre, il doit couvrir non seulement la prospection, mais aussi les processus de préparation, de conformité, de mise en marché, de suivi des lots, de pilotage et de reporting.
Documents de référence utilisés pour le cadrage :
• CDC version 0 d’IOX : base initiale orientée prospection, intermédiation, CRM export et cybersécurité.
• Dossier MCH recentré 2026–2029 : filière économique régionale, transformation locale, logistique mutualisée, conformité, traçabilité, gouvernance et budget.
• Courrier stratégique ADAAM / CMA / Conseil départemental : logique de préparation, structuration, sécurisation des outils de mise en marché et valorisation commerciale.
• Annexes juridiques, budget, business plan et documents de méthode déjà élaborés autour de MCH.

# 3. Objectifs du système

• Structurer l’accompagnement des bénéficiaires du programme MCH.
• Sécuriser les flux d’approvisionnement, de transformation, de conditionnement et de commercialisation.
• Garantir la conformité documentaire et réglementaire avant mise en marché.
• Assurer la traçabilité complète des lots et des décisions de validation.
• Piloter les stocks, la logistique et les expéditions.
• Suivre les prospects, acheteurs, commandes et opportunités.
• Produire des tableaux de bord métier et financeurs.

## Critères de réussite produit

# 4. Périmètre fonctionnel et hors périmètre

## Périmètre cible

• bénéficiaires, entreprises, utilisateurs et rôles ;
• produits, matières premières, fiches techniques et étiquettes ;
• contrats amont, approvisionnements et pièces justificatives ;
• réception matière, transformation, conditionnement, qualité ;
• traçabilité des lots, stocks, expéditions et incidents ;
• validation de mise en marché ;
• CRM commercial, prospects, opportunités, commandes ;
• reporting, KPI, exports et audit.

## Hors périmètre MVP recommandé

• market intelligence avancée basée IA ;
• moteur de scoring acheteurs algorithmique complexe ;
• portail acheteur multilingue complet ;
• application mobile native dédiée ;
• EDI ou intégrations logistiques complexes ;
• signature électronique qualifiée de niveau réglementaire avancé.

# 5. Utilisateurs, rôles et habilitations

# 6. Processus métier de référence

1. Onboarding bénéficiaire et diagnostic initial
2. Création et validation de la fiche produit
3. Création ou rattachement d’un contrat d’approvisionnement
4. Réception matière et contrôle documentaire
5. Transformation / conditionnement / contrôle qualité
6. Validation étiquetage et complétude documentaire
7. Décision de mise en marché
8. Ouverture à la commercialisation et suivi CRM
9. Préparation de commande et expédition
10. Gestion incident / non-conformité / retrait si nécessaire
11. Reporting opérationnel, COPIL et financeurs

## Workflow de référence : mise en marché

# 7. Règles métier critiques

Règle centrale : un produit ne peut être commercialisé que si les conditions cumulatives suivantes sont remplies :
• le flux d’approvisionnement est contractuellement sécurisé ;
• les formalités d’entrée à Mayotte sont conformes ;
• la transformation et le conditionnement ont été réalisés dans un cadre maîtrisé ;
• l’étiquetage a été validé ;
• le lot est traçable ;
• les responsabilités sont clairement attribuées ;
• la procédure de gestion des incidents est opérationnelle.

# 8. Étude fonctionnelle détaillée par module

## M1. Gestion des bénéficiaires

## M2. Produits et fiches techniques

## M3. Approvisionnement et contrats amont

## M4. Réception matière

## M5. Transformation et conditionnement

## M6. Traçabilité des lots

## M7. Validation de mise en marché

## M8. Étiquetage et validation documentaire

## M9. CRM commercial

## M10. Stocks et logistique

## M11. Incidents et non-conformités

## M12. Reporting et financeurs

## M13. Administration, audit et sécurité

# 9. Modèle de données et objets métier

Le CDC v0 d’IOX prévoyait un MCD très orienté Entreprise / Produit / Lead / Utilisateur / Contrat. Ce socle est insuffisant pour couvrir MCH. Le modèle de données cible doit être enrichi.

## Relations structurantes recommandées

• une entreprise peut être bénéficiaire, acheteur, fournisseur ou plusieurs de ces rôles ;
• un produit peut dépendre de plusieurs matières premières ;
• un contrat amont peut couvrir plusieurs produits ou matières ;
• un lot entrant peut alimenter plusieurs opérations de transformation ;
• une opération de transformation peut produire un ou plusieurs lots finis ;
• un lot fini peut faire l’objet d’une ou plusieurs décisions documentaires, mais une seule décision de mise en marché active ;
• une commande ne peut embarquer que des lots ayant un statut de mise en marché compatible.

# 10. Architecture technique cible

Choix recommandé pour le MVP : monolithe modulaire web-first, API documentée, stockage documentaire externe, journalisation centralisée et moteur de notifications. Cette approche maximise la vitesse de livraison tout en préservant l’évolutivité.

## Principe d’architecture

• un back-end unique composé de modules métier isolés ;
• un front-end unique avec routing par rôle et tableaux de bord ciblés ;
• une base PostgreSQL centralisant les objets métier et les statuts ;
• un stockage objet dédié aux documents et pièces justificatives ;
• un service de notifications (email dans le MVP, SMS/WhatsApp plus tard si besoin) ;
• un audit log transverse pour toutes les actions sensibles.

# 11. Interfaces et intégrations

# 12. Sécurité, auditabilité et conformité

• authentification forte recommandée pour les rôles sensibles ;
• gestion des rôles et séparation stricte création / validation / suppression ;
• journalisation obligatoire des décisions de mise en marché, réserves, suppressions et changements de statut critiques ;
• horodatage des décisions, rattachement au valideur, conservation du motif ;
• chiffrement en transit (TLS) et chiffrement des secrets / configurations ;
• sauvegardes quotidiennes base + documents ;
• restauration testée sur environnement non production ;
• conservation et consultation des versions documentaires et historiques de validation.

## Exigences non fonctionnelles

# 13. Reporting, KPI et financeurs

L’outil doit pouvoir alimenter le pilotage MCH et les exigences de reporting. Les documents de référence France 2030 insistent sur la capacité des porteurs à rendre compte de leur trajectoire, de leur gouvernance, de leurs cofinancements et de leurs résultats.
• nombre de bénéficiaires instruits et accompagnés ;
• produits actifs, produits validés, produits bloqués ;
• nombre de lots entrants / transformés / commercialisés ;
• volumes traités et expédiés ;
• délais de validation de mise en marché ;
• incidents ouverts / clos / critiques ;
• prospects, acheteurs actifs, commandes ;
• valeur commerciale générée et récurrence des commandes ;
• indicateurs par période, par filière, par bénéficiaire, par produit.

# 14. Environnements, DevOps et exploitation

• Environnement DEV : développement, tests unitaires, base de test locale ou partagée.
• Environnement INT / QA : validation fonctionnelle, recette, essais d’intégration.
• Environnement PREPROD : quasi-prod pour répétition générale avant livraison.
• Environnement PROD : exploitation réelle, sauvegardes, supervision, audit.

# 15. Roadmap recommandée

## Ordre recommandé des sprints MVP

• Sprint 0 : cadrage technique, architecture, sécurité de base, référentiels, rôles, environnement ;
• Sprint 1 : bénéficiaires, entreprises, produits, documents ;
• Sprint 2 : approvisionnement, réception matière, lots entrants ;
• Sprint 3 : transformation, conditionnement, traçabilité ;
• Sprint 4 : étiquetage, validation de mise en marché, audit log ;
• Sprint 5 : tableaux de bord de base, exports, stabilisation, recette.

# 16. Équipe type et estimation de charge macro

Estimation macro indicative (à confirmer après spécifications détaillées) :
• cadrage détaillé et architecture : 2 à 3 semaines ;
• MVP développement + recette : 12 à 16 semaines selon équipe et arbitrages ;
• V2 : 6 à 10 semaines supplémentaires ;
• V3 : selon besoin, 8 à 12 semaines et plus.

# 17. Risques techniques et recommandations

# 18. Critères de recette et livrables attendus des développeurs

## Livrables attendus

• code source versionné et documenté ;
• documentation d’installation et de déploiement ;
• documentation API ;
• schéma de base de données ;
• jeux de données de test ;
• scénarios de recette ;
• manuel utilisateur court pour administrateur et opérateurs ;
• PV de recette et liste des écarts.

## Recette minimale

• création d’un bénéficiaire, d’un produit, d’un contrat amont et d’un lot entrant ;
• exécution d’une transformation et création d’un lot produit fini ;
• validation d’étiquette et décision de mise en marché ;
• blocage d’un lot non conforme ;
• création d’une opportunité et d’une commande (si module activé) ;
• édition d’un export de reporting ;
• preuve d’audit sur les actions sensibles.

# 19. Conclusion et recommandation de lancement

Le CDC version 0 d’IOX constituait une bonne base orientée prospection, mais ne suffisait pas à couvrir les besoins réels du programme MCH. Le présent dossier d’étude technique repositionne IOX comme une plateforme métier de structuration, conformité, traçabilité, logistique et mise en marché, avec un cœur critique centré sur la décision de mise en marché et l’auditabilité des flux.
La recommandation est de lancer immédiatement la phase de spécifications détaillées et de lotissement MVP sur la base de ce dossier, en gardant comme principe : d’abord la fiabilité métier et la traçabilité, ensuite la traction commerciale, puis les automatismes avancés.
Fin du document.

[TABLE 1]
Objet : fournir aux développeurs, architectes, CTO, intégrateurs et parties prenantes un dossier technique complet, détaillé et directement exploitable pour la conception, le chiffrage, le lotissement et le développement de l’application IOX.

[TABLE 2]
Champ | Contenu
Projet de référence | MAYOTTE CONNECT HUB (MCH)
Porteur métier | ADAAM
Partenaires métier visés | CMA, CAPAM, partenaires techniques, financeurs, acheteurs et opérateurs logistiques
Horizon de déploiement | MVP + montée en charge V2/V3
Destinataires du dossier | Développeurs, agence, architecte logiciel, chef de projet, comité de pilotage

[TABLE 3]
Critère | Niveau attendu
Fiabilité métier | Aucun produit ne peut être commercialisé sans décision explicite de mise en marché.
Traçabilité | Chaque lot doit être retraçable de l’approvisionnement à la commande.
Auditabilité | Toute validation, réserve, blocage ou suppression sensible doit être horodaté et attribué.
Adoption terrain | L’outil doit être utilisable par des profils non techniques dans un contexte opérationnel simple.
Scalabilité | Le MVP doit supporter la montée en charge sans refonte majeure du modèle de données.

[TABLE 4]
Rôle | Responsabilités principales
Administrateur plateforme | Crée les rôles, paramètres, référentiels, supervise l’audit et les accès.
Coordinateur ADAAM | Pilote le dispositif, suit les bénéficiaires, arbitre les priorités, supervise les modules.
Référent accompagnement | Instruit les bénéficiaires, suit diagnostics et plans d’accompagnement.
Référent approvisionnement | Suit fournisseurs, contrats, documents amont et réceptions.
Référent qualité / conformité | Contrôle documents, étiquetage, transformation, traçabilité, incidents.
Opérateur transformation | Enregistre les opérations de transformation et de conditionnement.
Référent logistique | Gère stocks, mouvements, expéditions, retours et incidents logistiques.
Référent commercial | Suit prospects, acheteurs, opportunités, offres, commandes et réassorts.
Valideur mise en marché | Prend la décision Conforme / Conforme sous réserve / Non conforme.
Bénéficiaire | Consulte et complète ses informations, produits, documents et actions d’accompagnement.
Partenaire institutionnel lecture | Accès lecture aux tableaux de bord et au reporting, selon habilitation.
Auditeur | Accède aux journaux, décisions, versions documentaires et historiques des actions sensibles.

[TABLE 5]
Étape | Entrée | Sortie | Blocage possible

1. Dossier produit | Produit + documents | Fiche produit complète | Produit incomplet
2. Approvisionnement | Contrat + pièces amont | Flux amont sécurisé | Contrat absent / pièce manquante
3. Réception matière | Lot entrant + contrôles | Lot recevable | Réception bloquée / écart
4. Transformation | Lot recevable | Lot transformé | Non-conformité de production
5. Étiquetage | Données produit | Étiquette validée | Mention manquante / origine ambiguë
6. Traçabilité | Lien lots + opérations | Chaîne de traçabilité complète | Lot non retraçable
7. Validation marché | Tous contrôles précédents | Conforme / Réserve / Blocage | Décision négative

[TABLE 6]
Décision | Effet système | Exigences de preuve
Conforme | Ouverture commerciale autorisée | Date, valideur, fonction, signature/visa, commentaire
Conforme sous réserve | Ouverture conditionnelle + réserve visible | Date, valideur, réserves, échéance de levée
Non conforme / blocage | Commercialisation interdite | Date, valideur, motif, actions correctives

[TABLE 7]
Champ | Contenu
Objectif | Créer, qualifier, suivre et historiser les bénéficiaires, leur niveau de maturité, leur statut et leur plan d’accompagnement.
Données clés | Nom, catégorie, localisation, contact, statut, maturité, documents, historique, référent, actions prévues.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 8]
Champ | Contenu
Objectif | Décrire l’offre, les catégories de produits, la composition, l’origine, les capacités, visuels, statuts et pièces associées.
Données clés | Produit, matière première, version, packaging, origine, statut conformité, statut marché.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 9]
Champ | Contenu
Objectif | Gérer fournisseurs, coopératives, contrats, calendriers, volumes, pièces et alertes amont.
Données clés | Fournisseur, contrat, volume, période, pièce obligatoire, statut contractuel.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 10]
Champ | Contenu
Objectif | Contrôler les entrées à Mayotte et créer des lots entrants reliés à des documents d’import et des contrôles de réception.
Données clés | Lot entrant, quantité, date, documents, réserve, blocage, observateur.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 11]
Champ | Contenu
Objectif | Tracer les opérations réalisées à Mayotte et générer les lots transformés.
Données clés | Ordre de transformation, lot entrant, opération, opérateur, date, résultat, lot sortant.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 12]
Champ | Contenu
Objectif | Restituer la chaîne complète de traçabilité lot par lot.
Données clés | Lot amont, lot transformé, stock, expédition, commande, incident.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 13]
Champ | Contenu
Objectif | Décider de l’aptitude commerciale d’un lot ou produit.
Données clés | Statut conformité, checklist de validation, décision, réserves, signature.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 14]
Champ | Contenu
Objectif | Préparer et valider les étiquettes et documents de mise en marché.
Données clés | Version étiquette, mentions obligatoires, origine, preuve de validation.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 15]
Champ | Contenu
Objectif | Gérer prospects, acheteurs, opportunités, actions, offres et commandes.
Données clés | Lead, acheteur, canal, statut pipeline, action suivante, commande.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 16]
Champ | Contenu
Objectif | Piloter les niveaux de stock, mouvements, préparations et expéditions.
Données clés | Stock, emplacement, réservation, expédition, statut, preuve de livraison.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 17]
Champ | Contenu
Objectif | Qualifier, traiter et clôturer les incidents ou actions correctives.
Données clés | Type d’incident, lot, gravité, action corrective, responsable, échéance.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 18]
Champ | Contenu
Objectif | Produire indicateurs, exports et tableaux de bord.
Données clés | KPI, période, source, profil de diffusion, export.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 19]
Champ | Contenu
Objectif | Administrer les rôles, paramètres, référentiels, audit logs et politiques de sécurité.
Données clés | Utilisateur, rôle, droit, trace, alerte sécurité.
Statut de priorité | MVP pour M1 à M8 et M13 ; V2 pour M9 à M12, avec arbitrage possible selon budget.

[TABLE 20]
Entité | Rôle dans le système
Company | Entreprise bénéficiaire, acheteur, fournisseur, partenaire
BeneficiaryProfile | Sous-ensemble métier de bénéficiaire MCH
Product | Produit ou référence commerciale
RawMaterial | Matière première liée à un ou plusieurs produits
SupplyContract | Contrat ou convention avec un partenaire amont
InboundBatch | Lot entrant à réception
TransformationOperation | Étape de production / conditionnement
ProductBatch | Lot produit fini ou semi-fini
LabelVersion | Version d’étiquette ou document de validation
MarketReleaseDecision | Décision de mise en marché
StockMovement | Entrée, sortie, transfert, blocage de stock
Lead / Opportunity | Prospection commerciale
Order | Commande ou engagement commercial
Shipment | Expédition et suivi logistique
Incident | Non-conformité ou incident métier/logistique
Document | Pièce justificative ou preuve
AuditLog | Journal des actions sensibles
KPIRecord | Valeurs consolidées pour tableaux de bord

[TABLE 21]
Couche | Choix recommandé | Justification
Frontend | Next.js / TypeScript | Interface web robuste, rapide, SEO possible pour futures pages publiques, écosystème mature.
Backend | NestJS / TypeScript | Structuration modulaire, API REST claire, cohérence de langage front/back, bonne maintenabilité.
Base de données | PostgreSQL | Modèle relationnel adapté aux workflows, statuts, audit et traçabilité.
Cache / queues | Redis + BullMQ | Notifications, tâches asynchrones, imports, génération de rapports.
Stockage fichiers | S3 compatible (MinIO / cloud) | Versioning simple, gestion documentaire, scalabilité.
AuthN/AuthZ | OIDC/OAuth2 + rôles applicatifs | Sécurisation des accès et extensibilité.
API | REST + OpenAPI | Consommation simple par front et partenaires, documentation native.
Reporting | Exports Excel/PDF + vues SQL agrégées | Réponse pragmatique aux besoins financeurs et métier.

[TABLE 22]
Intégration | Statut recommandé | Usage
Messagerie email | MVP | Notifications, validations, alertes, relances
Génération PDF | MVP | Rapports, décisions, exports, dossiers
Export Excel/CSV | MVP | Financeurs, reporting, audit, analyses
Signature électronique simple interne | MVP | Visa numérique / preuve d’approbation
Portail acheteur | V2 | Consultation catalogues ou commandes
SMS / WhatsApp | V2 | Alertes terrain et relances courtes
API partenaires | V3 | Interfaçage logistique ou e-commerce
BI avancée / IA | V3 | Scoring, prévisions, market intelligence avancée

[TABLE 23]
Exigence | Niveau attendu
Disponibilité | ≥ 99,5 % en heures ouvrées dans le MVP
Temps de réponse | < 2 s sur les écrans courants ; < 5 s pour listes lourdes
Traçabilité | 100 % des actions sensibles journalisées
Audit | Exportable pour revue qualité / financeurs / pilotage
Scalabilité | Supporter plusieurs centaines de produits, lots, documents et utilisateurs sans refonte
Ergonomie | Utilisable par des profils peu techniques

[TABLE 24]
Chantier | Exigence recommandée
CI/CD | Pipeline d’intégration continue avec tests et déploiement contrôlé
Qualité code | Lint, tests unitaires, revue de code, conventions de nommage
Supervision | Logs applicatifs, erreurs, consommation disque, statut tâches
Backups | Base quotidienne + documents ; politique de rétention définie
Versioning | Git, branches courtes, tags de release, changelog

[TABLE 25]
Lot | Périmètre | Objectif
MVP | M1 à M8 + M13 | Sécuriser le cœur métier : bénéficiaires, produits, conformité, lots, validation marché, administration
V2 | M9 à M12 + améliorations logistiques | Développer la traction commerciale, le reporting et les incidents
V3 | Portail acheteurs, API partenaires, scoring/IA | Étendre l’écosystème et automatiser l’analyse

[TABLE 26]
Profil | Rôle
Chef de projet / PO | Pilotage, priorisation, validation métier
Architecte / lead dev | Architecture, revues, décisions techniques
Développeur front | Interface utilisateur, tableaux de bord, formulaires
Développeur back | API, workflow, règles métier, sécurité
QA / recette | Stratégie de test, validation fonctionnelle et non-régression
Référent métier | Arbitrage processus, conformité, critères de validation

[TABLE 27]
Risque | Impact | Recommandation
Surpérimètre dès la V1 | Retards et dilution | Limiter le MVP au cœur métier et reporter l’IA / market intelligence
Règles métier floues | Blocages de conception | Valider le workflow de mise en marché avant développement
Données mal structurées | Refonte coûteuse | Valider le modèle de données tôt et figer les statuts clés
Documents non normalisés | Incohérences et audits difficiles | Définir les types, versions et obligations documentaires
Rôles mal séparés | Risque de conformité et d’audit | Formaliser la matrice d’habilitations avant recette
Complexité logistique anticipée trop tôt | Coûts et retards | Garder les intégrations avancées pour V2/V3
