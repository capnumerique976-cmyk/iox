DOSSIER DE SPÉCIFICATIONS API
ET BASE DE DONNÉES
Application IOX – Contrat technique de réalisation
Version DOCX destinée aux développeurs, architectes et intégrateurs

# 1. Objet et portée

Le présent document complète le cahier des charges, le dossier d’étude technique, les spécifications détaillées et les maquettes fonctionnelles. Il fournit le niveau de précision attendu pour passer du besoin métier à la construction effective de la couche API et du schéma de base de données d’IOX.
• définir les standards API communs ;
• inventorier les endpoints par module ;
• proposer les schémas d’échange clés ;
• décrire les entités et relations métier ;
• proposer un modèle physique PostgreSQL cohérent ;
• sécuriser les rôles, droits et mécanismes d’audit.

# 2. Hypothèse d’architecture cible

L’API est pensée comme un backend unique modulaire, organisé par domaines métier. Les endpoints doivent rester cohérents avec les workflows du projet MCH, en particulier la chaîne bénéficiaire → produit → approvisionnement → lot entrant → transformation → validation de mise en marché → commercialisation.

# 3. Standards API transverses

## 3.1 Enveloppe de réponse standard

## 3.2 Enveloppe d’erreur standard

## 3.3 Codes HTTP recommandés

# 4. Sécurité API et auditabilité

• Toute route non publique doit exiger un JWT valide.
• Les rôles applicatifs doivent être évalués au niveau contrôleur/service.
• Toute action sensible doit générer un enregistrement d’audit : connexion, changement de statut, validation d’étiquette, décision de mise en marché, suppression logique, export sensible.
• Les pièces jointes doivent être servies via URL signée ou contrôles d’accès applicatifs.
• Les suppressions doivent être logiques de préférence ; la suppression physique est réservée aux besoins techniques ou RGPD strictement contrôlés.

# 5. Inventaire des modules API

## 5.1 AUTH / ADMIN

## 5.2 BENEFICIARIES

## 5.3 PRODUCTS

## 5.4 SUPPLY

## 5.5 RECEPTION / TRANSFORMATION

## 5.6 MARKET / INCIDENTS

## 5.7 CRM / LOGISTICS / REPORTING

# 6. Schémas de ressources clés

## 6.1 Beneficiary

## 6.2 Product

## 6.3 InboundBatch

## 6.4 ProductBatch

## 6.5 MarketReleaseDecision

# 7. Exemple d’endpoint critique : décision de mise en marché

## 7.1 Requête

## 7.2 Réponse attendue

## 7.3 Règles associées

• L’utilisateur doit posséder le rôle de valideur mise en marché ou un rôle habilité équivalent.
• Les cases obligatoires de checklist doivent être présentes.
• Si decision = conforme_sous_reserve, le tableau reservations ne peut pas être vide.
• Si decision = non_conforme, le motif de blocage doit être obligatoire.
• Une décision active remplace ou invalide la précédente selon la politique métier retenue.

# 8. Base de données – principes de modélisation

• Utiliser des UUID comme identifiants principaux pour les tables métier.
• Garder des codes fonctionnels lisibles pour les utilisateurs : BEN-0001, PRD-0001, IB-2026-0001, PB-2026-0001.
• Préférer les tables de référence pour les statuts et types évolutifs si l’on anticipe des personnalisations ; sinon ENUM PostgreSQL pour le MVP sur les statuts les plus stables.
• Mettre created_at, updated_at, created_by_user_id, updated_by_user_id sur toutes les tables métier majeures.
• Prévoir deleted_at pour la suppression logique si nécessaire.
• Documenter explicitement les règles de nullabilité et les contraintes d’unicité.

## 8.1 Tables principales recommandées

## 8.2 Schéma relationnel simplifié

# 9. Dictionnaire technique des tables principales

## 9.1 Table users

## 9.2 Table beneficiaries

## 9.3 Table products

## 9.4 Table supply_contracts

## 9.5 Table inbound_batches

## 9.6 Table transformation_operations

## 9.7 Table product_batches

## 9.8 Table market_release_decisions

## 9.9 Table incidents

## 9.10 Table audit_logs

# 10. Contraintes et index recommandés

• Index unique sur les codes fonctionnels : beneficiaries.code, products.code, inbound_batches.code, product_batches.code, incident_code.
• Index sur les colonnes de recherche et filtrage : status, beneficiary_id, product_id, supplier_company_id, received_at, validated_at.
• Index composites utiles : (status, updated_at), (product_id, market_eligibility_status), (linked_entity_type, linked_entity_id).
• Index GIN sur certaines colonnes JSONB si la checklist ou les réserves doivent être filtrées en SQL.
• Contrainte garantissant une seule décision de mise en marché active par lot : partial unique index sur market_release_decisions(product_batch_id) where is_active = true.

## Exemple de contrainte SQL recommandée

# 11. Squelette SQL de référence

# 12. Gestion documentaire

• Le stockage binaire doit être externalisé ; la base ne conserve que les métadonnées et références.
• La table documents doit permettre de lier un fichier à n’importe quelle entité métier via linked_entity_type + linked_entity_id ou table de jonction dédiée.
• Prévoir la version et le statut du document : draft / active / archived / rejected.

# 13. Exigences non fonctionnelles API / DB

# 14. Backlog technique recommandé

# 15. Points à arbitrer avant implémentation

• La gestion des acheteurs doit-elle reposer sur une table buyers spécifique ou une spécialisation de companies ?
• Les statuts seront-ils implémentés en ENUM PostgreSQL ou en tables de référence administrables ?
• Le mécanisme de signature/visa interne sur la décision de mise en marché doit-il être simple (audit + user + timestamp) ou renforcé ?
• Les documents doivent-ils pouvoir être partagés avec des acteurs externes par lien sécurisé ?
• La V1 doit-elle inclure dès le départ les commandes et la logistique, ou rester centrée sur le cœur conformité / traçabilité ?

# 16. Livrables attendus de l’équipe technique

• OpenAPI complète et versionnée ;
• schéma ERD / relationnel de la base de données ;
• migrations SQL ou ORM versionnées ;
• tests unitaires et d’intégration sur le cœur métier ;
• documentation d’installation et variables d’environnement ;
• jeu de données de démonstration ;
• journal des endpoints livrés par sprint.

# Conclusion

Ce dossier fournit le socle API et base de données attendu pour développer IOX de manière cohérente et sécurisée. Il doit être utilisé conjointement avec les spécifications détaillées, les maquettes fonctionnelles et le dossier de recette. Le point le plus critique à respecter est la cohérence entre le modèle de données, les workflows métier et la décision de mise en marché.
Fin du document.

[TABLE 1]
Objectif : définir précisément les conventions d’API, les ressources, les endpoints, les schémas d’échange, le modèle de données relationnel et les recommandations techniques pour développer IOX de façon cohérente, sécurisée et maintenable.

[TABLE 2]
Champ | Contenu
Projet | IOX au service du programme MCH
Type de document | Spécifications techniques API + base de données
Périmètre | MVP prioritaire + extensions V2/V3
Format cible | API REST JSON documentée OpenAPI + base PostgreSQL
Public | Lead dev, architecte, développeurs front/back, DevOps, QA, intégrateur

[TABLE 3]
Brique | Choix recommandé | Commentaire
Frontend | Next.js / TypeScript | Client web principal, consommation API REST.
Backend | NestJS / TypeScript | Architecture modulaire, validation forte, docs OpenAPI.
Base de données | PostgreSQL 15+ | Relationnel robuste, indexation et contraintes fortes.
Cache / jobs | Redis + BullMQ | Files d’attente, exports, notifications, tâches asynchrones.
Stockage documentaire | S3 compatible | Pièces jointes, versioning simple, URLs signées.
Authentification | OIDC/OAuth2 + JWT | Interopérable, extensible, sécurisation des rôles.
Documentation API | OpenAPI / Swagger | Contrat vivant et testable.

[TABLE 4]
Champ | Contenu
Base URL | /api/v1
Format | JSON UTF-8 pour les données métier ; multipart/form-data pour les uploads de fichiers
Dates / heures | ISO 8601, UTC côté API
Authentification | Bearer JWT
Autorisation | RBAC applicatif + contrôles de propriété métier si nécessaire
Pagination | page, pageSize, total, totalPages
Tri | sortBy, sortDir
Filtres | query params explicites ; pas de logique implicite côté client
Idempotence | Recommandée pour certaines écritures critiques ou imports
Versioning | Version API dans l’URL ; version des ressources dans les objets métier si nécessaire

[TABLE 5]
{ / "success": true, / "data": { }, / "meta": { / "page": 1, / "pageSize": 20, / "total": 152, / "totalPages": 8 / }, / "message": "OK" / }

[TABLE 6]
{ / "success": false, / "error": { / "code": "MARKET_RELEASE_RULE_FAILED", / "message": "Le lot ne peut pas être commercialisé.", / "details": [ / { "field": "labelVersionId", "message": "Étiquette non validée." } / ], / "traceId": "9b4d7c2e-1c8e-4b4b-9e9a-111111111111" / } / }

[TABLE 7]
Code | Usage
200 | Lecture ou mise à jour réussie
201 | Création réussie
204 | Suppression logique ou action sans corps de réponse
400 | Entrée invalide / règle métier non respectée
401 | Non authentifié
403 | Interdit selon le rôle ou l’habilitation
404 | Ressource introuvable
409 | Conflit d’état / doublon / incohérence métier
422 | Validation sémantique fine échouée
500 | Erreur interne non gérée

[TABLE 8]
Module | Périmètre
AUTH | Authentification, sessions, profil courant
ADMIN | Utilisateurs, rôles, paramètres, audit
BENEFICIARIES | Bénéficiaires, diagnostics, plans d’accompagnement
PRODUCTS | Produits, matières, versions documentaires, étiquettes
SUPPLY | Partenaires amont, contrats, pièces contractuelles
RECEPTION | Lots entrants, contrôles de réception
TRANSFORMATION | Ordres de transformation, lots finis
MARKET | Décisions de mise en marché
INCIDENTS | Incidents, non-conformités, actions correctives
CRM | Acheteurs, leads, opportunités, commandes
LOGISTICS | Stocks, mouvements, expéditions
REPORTING | KPIs, exports, tableaux de bord
DOCUMENTS | Pièces jointes et métadonnées documentaires

[TABLE 9]
Méthode | Endpoint | Usage
POST | /auth/login | Authentifier un utilisateur
POST | /auth/refresh | Rafraîchir un token
GET | /auth/me | Retourner le profil courant
GET | /users | Lister les utilisateurs
POST | /users | Créer un utilisateur
GET | /users/{id} | Consulter un utilisateur
PATCH | /users/{id} | Mettre à jour un utilisateur
POST | /users/{id}/roles | Affecter un rôle
GET | /roles | Lister les rôles
GET | /audit-logs | Lister les traces d’audit

[TABLE 10]
Méthode | Endpoint | Usage
GET | /beneficiaries | Lister les bénéficiaires
POST | /beneficiaries | Créer un bénéficiaire
GET | /beneficiaries/{id} | Consulter une fiche bénéficiaire
PATCH | /beneficiaries/{id} | Mettre à jour une fiche bénéficiaire
POST | /beneficiaries/{id}/activate | Activer un bénéficiaire
POST | /beneficiaries/{id}/suspend | Suspendre un bénéficiaire
POST | /beneficiaries/{id}/documents | Ajouter une pièce
POST | /beneficiaries/{id}/diagnosis | Enregistrer un diagnostic

[TABLE 11]
Méthode | Endpoint | Usage
GET | /products | Lister les produits
POST | /products | Créer un produit
GET | /products/{id} | Consulter une fiche produit
PATCH | /products/{id} | Mettre à jour un produit
POST | /products/{id}/versions | Créer une nouvelle version produit
GET | /products/{id}/labels | Lister les versions d’étiquette
POST | /products/{id}/labels | Créer une version d’étiquette
POST | /products/{id}/request-documentary-validation | Demander validation documentaire

[TABLE 12]
Méthode | Endpoint | Usage
GET | /suppliers | Lister les partenaires amont
POST | /suppliers | Créer un partenaire amont
GET | /supply-contracts | Lister les contrats
POST | /supply-contracts | Créer un contrat amont
GET | /supply-contracts/{id} | Consulter un contrat
PATCH | /supply-contracts/{id} | Mettre à jour un contrat
POST | /supply-contracts/{id}/activate | Activer un contrat
POST | /supply-contracts/{id}/suspend | Suspendre un contrat

[TABLE 13]
Méthode | Endpoint | Usage
GET | /inbound-batches | Lister les lots entrants
POST | /inbound-batches | Créer un lot entrant
GET | /inbound-batches/{id} | Consulter un lot entrant
POST | /inbound-batches/{id}/controls | Enregistrer un contrôle de réception
POST | /inbound-batches/{id}/reserve | Mettre en réserve
POST | /inbound-batches/{id}/reject | Rejeter un lot entrant
GET | /transformation-operations | Lister les opérations de transformation
POST | /transformation-operations | Créer un ordre de transformation
POST | /transformation-operations/{id}/close | Clôturer l’opération et générer lot(s) fini(s)
GET | /product-batches/{id} | Consulter un lot fini

[TABLE 14]
Méthode | Endpoint | Usage
POST | /label-validations/{labelVersionId}/approve | Valider une version d’étiquette
POST | /label-validations/{labelVersionId}/reject | Rejeter une version d’étiquette
GET | /market-release-decisions | Lister les décisions marché
POST | /market-release-decisions | Créer une décision de mise en marché
GET | /market-release-decisions/{id} | Consulter une décision
GET | /incidents | Lister les incidents
POST | /incidents | Créer un incident
PATCH | /incidents/{id} | Mettre à jour un incident
POST | /incidents/{id}/close | Clore un incident

[TABLE 15]
Méthode | Endpoint | Usage
GET | /buyers | Lister les acheteurs
GET | /opportunities | Lister les opportunités
POST | /opportunities | Créer une opportunité
PATCH | /opportunities/{id} | Mettre à jour une opportunité
POST | /orders | Créer une commande
GET | /orders/{id} | Consulter une commande
GET | /stock-movements | Lister les mouvements de stock
POST | /stock-reservations | Réserver des lots
POST | /shipments | Créer une expédition
GET | /dashboard | Retourner les KPIs tableau de bord
GET | /reports/exports | Déclencher / télécharger un export

[TABLE 16]
{ / "id": "uuid", / "code": "BEN-0001", / "name": "Atelier Mahorais", / "category": "artisan", / "location": { "commune": "Combani", "country": "Mayotte" }, / "status": "active", / "maturityLevel": "intermediate", / "mainContact": { / "fullName": "Nom Prénom", / "phone": "+262...", / "email": "contact@example.com" / }, / "assignedAdvisorId": "uuid", / "createdAt": "2026-08-05T10:00:00Z", / "updatedAt": "2026-08-12T10:00:00Z" / }

[TABLE 17]
{ / "id": "uuid", / "beneficiaryId": "uuid", / "code": "PRD-0001", / "name": "Épices premium", / "category": "alimentaire", / "primaryOriginCountry": "Madagascar", / "transformationCountry": "Mayotte", / "documentaryStatus": "validated", / "marketStatus": "not_released", / "activeVersionId": "uuid" / }

[TABLE 18]
{ / "id": "uuid", / "code": "IB-2026-0001", / "supplierId": "uuid", / "supplyContractId": "uuid", / "rawMaterialId": "uuid", / "receivedAt": "2026-09-01T08:30:00Z", / "quantityReceived": 120.5, / "uom": "kg", / "status": "under_control", / "documentStatus": "complete" / }

[TABLE 19]
{ / "id": "uuid", / "code": "PB-2026-0008", / "productId": "uuid", / "sourceInboundBatchIds": ["uuid"], / "transformationOperationId": "uuid", / "quantity": 95.0, / "uom": "kg", / "qualityStatus": "controlled", / "marketEligibilityStatus": "pending" / }

[TABLE 20]
{ / "id": "uuid", / "productBatchId": "uuid", / "decision": "conforme_sous_reserve", / "checklist": { / "supplySecured": true, / "entryFormalitiesCompliant": true, / "transformationControlled": true, / "labelValidated": true, / "batchTraceable": true, / "responsibilitiesAssigned": true, / "incidentProcedureOperational": true / }, / "reservations": [ / { "code": "RES-01", "label": "Compléter justificatif complémentaire avant le 15/10/2026" } / ], / "validatedByUserId": "uuid", / "validatedAt": "2026-10-01T09:00:00Z", / "signatureType": "internal_approval" / }

[TABLE 21]
POST /api/v1/market-release-decisions / Authorization: Bearer <token> / Content-Type: application/json / / { / "productBatchId": "uuid-batch", / "decision": "conforme", / "comment": "Toutes les conditions sont remplies.", / "checklist": { / "supplySecured": true, / "entryFormalitiesCompliant": true, / "transformationControlled": true, / "labelValidated": true, / "batchTraceable": true, / "responsibilitiesAssigned": true, / "incidentProcedureOperational": true / }, / "reservations": [] / }

[TABLE 22]
201 Created / { / "success": true, / "data": { / "id": "uuid-decision", / "productBatchId": "uuid-batch", / "decision": "conforme", / "validatedByUserId": "uuid-user", / "validatedAt": "2026-10-01T09:00:00Z" / }, / "message": "Décision de mise en marché enregistrée." / }

[TABLE 23]
Table | Description
users | Utilisateurs applicatifs
roles | Rôles applicatifs
user_roles | Association utilisateurs ↔ rôles
companies | Référentiel entreprise / partenaire
beneficiaries | Profil bénéficiaire MCH
beneficiary_documents | Documents du bénéficiaire
products | Produits
product_versions | Versions de fiche produit
label_versions | Versions d’étiquette
suppliers | Partenaires amont si séparés de companies ou vue spécialisée
supply_contracts | Contrats ou conventions amont
raw_materials | Matières premières
inbound_batches | Lots entrants
inbound_batch_documents | Pièces liées au lot entrant
reception_controls | Contrôles de réception
transformation_operations | Ordres de transformation
product_batches | Lots transformés / produits finis
batch_trace_links | Liens de traçabilité amont ↔ aval
market_release_decisions | Décisions de mise en marché
incidents | Incidents et non-conformités
buyers | Acheteurs (ou companies spécialisées)
opportunities | Leads / opportunités
orders | Commandes
order_lines | Lignes de commande
stock_locations | Emplacements / dépôts
stock_movements | Mouvements de stock
shipments | Expéditions
shipment_lines | Lots embarqués
documents | Référentiel documentaire générique
audit_logs | Journal d’audit

[TABLE 24]
beneficiaries (1) --- (N) products / companies (1) --- (N) beneficiaries / companies (1) --- (N) supply_contracts / products (1) --- (N) product_versions / products (1) --- (N) label_versions / supply_contracts (1) --- (N) inbound_batches / inbound_batches (1) --- (N) reception_controls / inbound_batches (N) --- (N) transformation_operations via batch_trace_links / transformation_operations (1) --- (N) product_batches / product_batches (1) --- (N) market_release_decisions / product_batches (1) --- (N) stock_movements / product_batches (N) --- (N) shipments via shipment_lines / buyers/companies (1) --- (N) opportunities / opportunities (1) --- (0..1) orders / orders (1) --- (N) order_lines / all major entities --- (N) documents / all sensitive actions --- (N) audit_logs

[TABLE 25]
Colonne | Type | Règle
id | uuid | PK
email | varchar(255) | unique, not null
password_hash | varchar(255) | nullable si SSO seul
status | user_status | not null
last_login_at | timestamptz | nullable

[TABLE 26]
Colonne | Type | Règle
id | uuid | PK
company_id | uuid | FK companies.id
code | varchar(50) | unique, not null
category | varchar(50) | not null
status | beneficiary_status | not null
maturity_level | varchar(50) | nullable
assigned_advisor_user_id | uuid | FK users.id

[TABLE 27]
Colonne | Type | Règle
id | uuid | PK
beneficiary_id | uuid | FK beneficiaries.id
code | varchar(50) | unique, not null
name | varchar(255) | not null
category | varchar(100) | not null
primary_origin_country | varchar(100) | nullable
transformation_country | varchar(100) | nullable
documentary_status | product_documentary_status | not null
market_status | product_market_status | not null
active_version_id | uuid | nullable

[TABLE 28]
Colonne | Type | Règle
id | uuid | PK
supplier_company_id | uuid | FK companies.id
reference | varchar(100) | unique
status | supply_contract_status | not null
start_date | date | not null
end_date | date | nullable
scope_notes | text | nullable

[TABLE 29]
Colonne | Type | Règle
id | uuid | PK
code | varchar(100) | unique
supply_contract_id | uuid | FK supply_contracts.id
raw_material_id | uuid | FK raw_materials.id
received_at | timestamptz | not null
quantity_received | numeric(14,3) | not null
uom | varchar(20) | not null
status | inbound_batch_status | not null
document_status | document_status | not null

[TABLE 30]
Colonne | Type | Règle
id | uuid | PK
operation_code | varchar(100) | unique
operation_type | varchar(50) | not null
started_at | timestamptz | not null
closed_at | timestamptz | nullable
operator_user_id | uuid | FK users.id
status | transformation_status | not null

[TABLE 31]
Colonne | Type | Règle
id | uuid | PK
code | varchar(100) | unique
product_id | uuid | FK products.id
transformation_operation_id | uuid | FK transformation_operations.id
quantity | numeric(14,3) | not null
uom | varchar(20) | not null
quality_status | batch_quality_status | not null
market_eligibility_status | market_eligibility_status | not null

[TABLE 32]
Colonne | Type | Règle
id | uuid | PK
product_batch_id | uuid | FK product_batches.id
decision | market_release_decision_status | not null
checklist_json | jsonb | not null
comment | text | nullable
reservations_json | jsonb | nullable
validated_by_user_id | uuid | FK users.id
validated_at | timestamptz | not null
is_active | boolean | default true

[TABLE 33]
Colonne | Type | Règle
id | uuid | PK
incident_code | varchar(100) | unique
type | varchar(100) | not null
severity | incident_severity | not null
status | incident_status | not null
linked_entity_type | varchar(50) | not null
linked_entity_id | uuid | not null
responsible_user_id | uuid | FK users.id

[TABLE 34]
Colonne | Type | Règle
id | uuid | PK
occurred_at | timestamptz | not null
user_id | uuid | FK users.id
action | varchar(100) | not null
entity_type | varchar(50) | not null
entity_id | uuid | not null
payload_before | jsonb | nullable
payload_after | jsonb | nullable
trace_id | uuid | nullable

[TABLE 35]
CREATE UNIQUE INDEX ux_market_release_active / ON market_release_decisions(product_batch_id) / WHERE is_active = true;

[TABLE 36]
CREATE TABLE beneficiaries ( / id uuid PRIMARY KEY, / company_id uuid NOT NULL REFERENCES companies(id), / code varchar(50) NOT NULL UNIQUE, / category varchar(50) NOT NULL, / status varchar(30) NOT NULL, / maturity_level varchar(50), / assigned_advisor_user_id uuid REFERENCES users(id), / created_at timestamptz NOT NULL DEFAULT now(), / updated_at timestamptz NOT NULL DEFAULT now() / ); / / CREATE TABLE products ( / id uuid PRIMARY KEY, / beneficiary_id uuid NOT NULL REFERENCES beneficiaries(id), / code varchar(50) NOT NULL UNIQUE, / name varchar(255) NOT NULL, / category varchar(100) NOT NULL, / primary_origin_country varchar(100), / transformation_country varchar(100), / documentary_status varchar(30) NOT NULL, / market_status varchar(30) NOT NULL, / active_version_id uuid, / created_at timestamptz NOT NULL DEFAULT now(), / updated_at timestamptz NOT NULL DEFAULT now() / ); / / CREATE TABLE market_release_decisions ( / id uuid PRIMARY KEY, / product_batch_id uuid NOT NULL REFERENCES product_batches(id), / decision varchar(40) NOT NULL, / checklist_json jsonb NOT NULL, / comment text, / reservations_json jsonb, / validated_by_user_id uuid NOT NULL REFERENCES users(id), / validated_at timestamptz NOT NULL, / is_active boolean NOT NULL DEFAULT true, / created_at timestamptz NOT NULL DEFAULT now() / );

[TABLE 37]
Objet | Documents typiques
Bénéficiaire | Pièces d’identification, pièces structure, justificatifs
Produit | Fiches techniques, visuels, certificats, annexes
Contrat amont | Contrat signé, avenants, annexes
Lot entrant | Documents d’import, contrôles, observations
Lot fini | Contrôles qualité, preuves de conditionnement
Étiquette | Version étiquette, preuve de validation
Décision marché | PV ou export de décision si nécessaire
Incident | Rapport, preuve, action corrective
Commande / expédition | Bon de préparation, document de transport, preuve livraison

[TABLE 38]
Exigence | Niveau attendu
Temps de réponse | < 500 ms sur lectures simples ; < 2 s sur listes paginées standard
Transactions | Obligatoires sur les écritures critiques (validation marché, clôture transformation, réservation de stock)
Logs | Corrélables via traceId / requestId
Migrations | Gestionnées par outil de migration versionné
Tests | Unitaires sur règles métier critiques + tests d’intégration API
Backups | Sauvegarde quotidienne DB + stratégie restauration documentée

[TABLE 39]
Lot | Backlog technique
Sprint 0 | Set-up projet, auth, rôles, base commune, conventions API, OpenAPI, logs
Sprint 1 | Beneficiaries + Products + Documents de base
Sprint 2 | Supply + Inbound batches + Reception controls
Sprint 3 | Transformation + Product batches + Trace links
Sprint 4 | Label validations + Market release decisions + Audit logs sensibles
Sprint 5 | Dashboard + exports + stabilisation + optimisation requêtes
V2 | CRM + orders + stock + shipments + incidents + reporting avancé
