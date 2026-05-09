SPÉCIFICATIONS DÉTAILLÉES ÉCRAN PAR ÉCRAN
ET BACKLOG DÉVELOPPEUR
Application IOX – version DOCX
Document complémentaire au dossier d’étude technique

# 1. Objectif du document

Ce document complète le cahier des charges et le dossier d’étude technique. Il décrit, écran par écran, le comportement attendu de l’application IOX, les champs et actions principaux, les validations, les règles métier associées, ainsi que le backlog de développement priorisé.
Le document est structuré en trois parties :
• spécifications transverses et principes d’interface ;
• spécifications détaillées écran par écran ;
• backlog développeur priorisé avec critères d’acceptation.

# 2. Principes UX et techniques transverses

• L’application est web-first, responsive, avec priorité à l’usage bureau et tablette.
• Toute action sensible doit être tracée dans un journal d’audit.
• Les formulaires doivent supporter la sauvegarde brouillon.
• Les statuts doivent être visibles dans les listes, fiches et tableaux de bord.
• Les droits d’accès doivent masquer ou désactiver les actions interdites.
• Les pièces jointes doivent être versionnées et liées à l’objet métier concerné.
• Les exports Excel/PDF doivent être disponibles sur les écrans de reporting et de listes clés.
• Le moteur de recherche doit supporter au minimum : nom, code, statut, dates, lots, bénéficiaires.

# 3. Référentiel de statuts transverses

# 4. Spécifications détaillées écran par écran

## E01 – Tableau de bord principal

## E02 – Liste des bénéficiaires

## E03 – Fiche bénéficiaire

## E04 – Liste des produits

## E05 – Fiche produit

## E06 – Liste des partenaires / fournisseurs

## E07 – Fiche contrat d’approvisionnement

## E08 – Réception matière – création de lot entrant

## E09 – Fiche lot entrant

## E10 – Ordre de transformation

## E11 – Fiche lot transformé / produit fini

## E12 – Validation d’étiquetage

## E13 – Écran de décision de mise en marché

## E14 – Liste des opportunités commerciales

## E15 – Fiche commande

## E16 – Écran stocks et mouvements

## E17 – Écran expédition

## E18 – Gestion des incidents

## E19 – Reporting et exports

## E20 – Administration, rôles et audit log

# 5. Backlog développeur priorisé

## Découpage par épics

## User stories MVP prioritaires

## User stories V2 / V3

## Critères d’acceptation clés du MVP

• Créer un bénéficiaire puis une fiche produit avec pièces jointes.
• Créer un partenaire amont puis un contrat actif.
• Créer un lot entrant, le contrôler et le faire passer à un statut recevable.
• Enregistrer une transformation et produire un lot fini traçable.
• Valider une étiquette puis prendre une décision de mise en marché.
• Bloquer commercialement un lot non conforme.
• Consulter l’historique d’un lot et l’audit des validations.
• Exporter un reporting simple au format Excel/PDF.

# 6. Consignes de réalisation pour l’équipe de développement

• Commencer par figer les statuts et le modèle de données du MVP avant toute implémentation lourde.
• Développer les modules dans l’ordre du workflow métier, pas dans l’ordre cosmétique des écrans.
• Prévoir des composants réutilisables pour listes, filtres, statuts, pièces jointes, validations et journaux.
• Mettre en place les tests unitaires sur les règles critiques de mise en marché.
• Prévoir des jeux de données de test couvrant lots conformes, sous réserve et bloqués.
• Associer le PO ou référent métier à la recette de chaque sprint.

# Conclusion

Ce document constitue la version DOCX des spécifications détaillées et du backlog de l’application IOX. Il est conçu pour être transmis directement à une équipe de développement comme base de réalisation, de chiffrage et de planification.
Fin du document.

[TABLE 1]
Objet : fournir aux développeurs un document opérationnel détaillant les écrans, les champs, les actions, les règles de validation, les dépendances et le backlog produit priorisé pour IOX.

[TABLE 2]
Champ | Contenu
Projet de référence | MAYOTTE CONNECT HUB (MCH)
Version du document | V1
Finalité | Traduire le cadrage fonctionnel et l’étude technique en spécifications de réalisation directement exploitables
Périmètre | MVP + backlog V2/V3
Destinataires | Développeurs, agence, lead dev, architecte, PO, QA

[TABLE 3]
Objet | Statuts recommandés
Bénéficiaire | Brouillon / À instruire / Actif / Suspendu / Clos
Produit | Brouillon / En cours de conformité / Validé documentaire / Bloqué
Contrat amont | Projet / En signature / Actif / Expiré / Suspendu
Lot entrant | Reçu / Sous contrôle / Conforme / Réserve / Rejeté
Lot transformé | En production / Contrôlé / Prêt pour validation / Bloqué
Décision de mise en marché | Conforme / Conforme sous réserve / Non conforme / Expirée
Opportunité commerciale | Nouveau / Qualifié / En négociation / Gagné / Perdu
Commande | Brouillon / Confirmée / Préparée / Expédiée / Livrée / Litige
Incident | Ouvert / En analyse / Action en cours / Clos / Escaladé

[TABLE 4]
Champ | Contenu
Module | Transverse
Utilisateurs concernés | Coordinateur ADAAM, administrateur, partenaires en lecture selon habilitation
Objectif | Donner une vue consolidée de l’activité : bénéficiaires, produits, lots, validations, incidents, commandes, KPI.
Point d’entrée | Connexion utilisateur
Résultat attendu | Navigation vers les modules ; alertes opérationnelles ; KPIs synthétiques
Champs / données principales | Cartes KPI, alertes, tâches à faire, derniers incidents, dernières validations, raccourcis par rôle
Actions utilisateur | Filtrer période ; exporter ; naviguer ; ouvrir détail objet ; consulter tâches urgentes
Validations | Aucune validation métier, mais contrôle d’habilitation pour les widgets visibles
Règles métier | Le contenu varie selon le rôle. Les alertes bloquantes doivent remonter en haut de l’écran.
Erreurs / cas limites | Aucune donnée disponible ; accès partiel ; widget indisponible
Priorité | MVP

[TABLE 5]
Champ | Contenu
Module | M1
Utilisateurs concernés | Coordinateur ADAAM, référent accompagnement
Objectif | Lister, filtrer et rechercher les bénéficiaires du programme
Point d’entrée | Menu Bénéficiaires
Résultat attendu | Accès fiche bénéficiaire, création, export, changement de statut
Champs / données principales | Nom, catégorie, commune, référent, statut, maturité, date d’entrée, nombre de produits, alertes
Actions utilisateur | Créer ; filtrer ; rechercher ; exporter ; ouvrir fiche ; suspendre
Validations | Seuls les profils habilités peuvent modifier le statut
Règles métier | Un bénéficiaire clos n’est plus modifiable, sauf par administrateur ou coordinateur
Erreurs / cas limites | Doublon potentiel ; bénéficiaire incomplet ; filtre sans résultat
Priorité | MVP

[TABLE 6]
Champ | Contenu
Module | M1
Utilisateurs concernés | Coordinateur ADAAM, référent accompagnement, bénéficiaire (vue limitée)
Objectif | Consulter et mettre à jour le dossier bénéficiaire
Point d’entrée | Depuis liste bénéficiaires
Résultat attendu | Dossier complet avec pièces, historique, produits, plan d’accompagnement
Champs / données principales | Identité, contacts, structure, activités, niveau de maturité, documents, historique, commentaires, actions de suivi
Actions utilisateur | Modifier ; joindre document ; affecter référent ; créer produit ; enregistrer diagnostic ; changer statut
Validations | Champs obligatoires pour activation ; pièces minimales si exigées
Règles métier | Le statut Actif nécessite un dossier minimal complet
Erreurs / cas limites | Document refusé ; champ obligatoire manquant ; droit insuffisant
Priorité | MVP

[TABLE 7]
Champ | Contenu
Module | M2
Utilisateurs concernés | Référent produit, conformité, commercial
Objectif | Lister tous les produits et suivre leur état de préparation
Point d’entrée | Menu Produits
Résultat attendu | Fiche produit, création, filtres, export
Champs / données principales | Code produit, nom, catégorie, bénéficiaire, origine, statut documentaire, statut marché, dernière version
Actions utilisateur | Créer ; filtrer ; rechercher ; exporter ; ouvrir fiche
Validations | Aucune hors habilitation
Règles métier | Le statut marché doit être visible en liste
Erreurs / cas limites | Code produit en doublon ; absence de résultat
Priorité | MVP

[TABLE 8]
Champ | Contenu
Module | M2
Utilisateurs concernés | Référent produit, conformité, bénéficiaire (édition contrôlée)
Objectif | Décrire le produit et centraliser tous les éléments nécessaires à sa qualification
Point d’entrée | Liste produits / création
Résultat attendu | Produit enregistrable, versionné et relié à documents et lots
Champs / données principales | Nom, catégorie, description, composition, origine matière première, lieu de transformation, packaging, visuels, capacité, documents, statut
Actions utilisateur | Créer ; modifier ; versionner ; joindre documents ; demander validation documentaire
Validations | Nom, catégorie, bénéficiaire, origine, lieu de transformation, statut
Règles métier | Impossible de demander validation documentaire si les champs critiques sont vides
Erreurs / cas limites | Version incohérente ; document manquant ; utilisateur non habilité
Priorité | MVP

[TABLE 9]
Champ | Contenu
Module | M3
Utilisateurs concernés | Référent approvisionnement, coordination
Objectif | Gérer les partenaires amont et leur statut
Point d’entrée | Menu Approvisionnement
Résultat attendu | Fiche partenaire, contrat, documents amont
Champs / données principales | Nom partenaire, pays, type, statut, contrats actifs, niveau de conformité
Actions utilisateur | Créer ; modifier ; ouvrir contrat ; filtrer ; exporter
Validations | Rôle requis
Règles métier | Un partenaire sans contrat actif ne peut alimenter un lot entrant validé
Erreurs / cas limites | Doublon partenaire ; fiche incomplète
Priorité | MVP

[TABLE 10]
Champ | Contenu
Module | M3
Utilisateurs concernés | Référent approvisionnement, juridique/réglementaire, coordination
Objectif | Tracer les conventions et contrats sécurisant l’approvisionnement
Point d’entrée | Depuis fiche partenaire ou création
Résultat attendu | Contrat actif, suspendu ou expiré
Champs / données principales | Référence contrat, partenaire, produit/matière, dates, volumes, pièces, responsabilités, statut
Actions utilisateur | Créer ; modifier ; joindre version signée ; activer ; suspendre ; expirer
Validations | Dates, partenaire, périmètre produit/matière, document contractuel
Règles métier | Le statut Actif requiert au moins une pièce contractuelle de référence
Erreurs / cas limites | Date incohérente ; document absent ; chevauchement de contrat
Priorité | MVP

[TABLE 11]
Champ | Contenu
Module | M4
Utilisateurs concernés | Référent réception, qualité, logistique
Objectif | Enregistrer l’arrivée d’un lot et ses contrôles de réception
Point d’entrée | Menu Réception / bouton Nouveau lot entrant
Résultat attendu | Lot entrant créé avec statut initial
Champs / données principales | Référence lot, partenaire, produit/matière, date réception, quantité, documents associés, observations
Actions utilisateur | Créer lot ; joindre pièces ; enregistrer contrôle ; réserver ; bloquer
Validations | Partenaire connu, contrat actif, quantité > 0, pièce minimale si imposée
Règles métier | Le lot ne passe pas Conforme sans contrôle documentaire validé
Erreurs / cas limites | Contrat absent ; quantité invalide ; document obligatoire manquant
Priorité | MVP

[TABLE 12]
Champ | Contenu
Module | M4
Utilisateurs concernés | Qualité, logistique, conformité
Objectif | Consulter le lot entrant, son statut, ses pièces et ses écarts
Point d’entrée | Liste lots entrants
Résultat attendu | Statut conforme / réserve / rejet, liens de traçabilité
Champs / données principales | Identifiant lot, source, date, quantité, documents, contrôles, statut, observations, incidents liés
Actions utilisateur | Valider ; mettre en réserve ; rejeter ; créer incident ; lier à transformation
Validations | Décision de réception selon règles internes
Règles métier | Un lot rejeté ne peut pas être engagé en transformation
Erreurs / cas limites | Lot déjà utilisé ; incohérence documentaire
Priorité | MVP

[TABLE 13]
Champ | Contenu
Module | M5
Utilisateurs concernés | Opérateur transformation, qualité
Objectif | Lancer et tracer une opération de transformation/conditionnement
Point d’entrée | Depuis lot entrant conforme
Résultat attendu | Opération créée, lot(s) transformé(s) généré(s)
Champs / données principales | Lot entrant, type opération, date, opérateur, quantité engagée, quantité sortie, observations, pièces qualité
Actions utilisateur | Démarrer ; enregistrer progression ; clôturer ; créer lot produit fini
Validations | Lot entrant éligible ; quantité cohérente ; opérateur identifié
Règles métier | La quantité sortie ne peut pas excéder la quantité engagée
Erreurs / cas limites | Lot source invalide ; quantité incohérente ; opération doublonnée
Priorité | MVP

[TABLE 14]
Champ | Contenu
Module | M5/M6
Utilisateurs concernés | Qualité, conformité, logistique, valideur marché
Objectif | Centraliser toutes les informations d’un lot prêt à être évalué
Point d’entrée | Depuis ordre de transformation ou liste lots
Résultat attendu | Lot prêt pour validation marché ou bloqué
Champs / données principales | Code lot, produit, quantité, date, opération source, documents, étiquette, statut qualité, traçabilité
Actions utilisateur | Joindre pièces ; lier étiquette ; demander validation marché ; bloquer ; créer incident
Validations | Lot complet avant demande de validation
Règles métier | Demande de validation impossible si étiquette ou traçabilité manquante
Erreurs / cas limites | Pièces insuffisantes ; lot incomplet
Priorité | MVP

[TABLE 15]
Champ | Contenu
Module | M8
Utilisateurs concernés | Conformité, référent produit, valideur documentaire
Objectif | Contrôler et valider les étiquettes et documents liés à la mise en marché
Point d’entrée | Depuis fiche produit ou lot fini
Résultat attendu | Version étiquette validée / rejetée
Champs / données principales | Version, mentions obligatoires, origine, opérateur responsable, visuel, date, commentaires
Actions utilisateur | Valider ; rejeter ; demander correction ; historiser version
Validations | Mentions critiques présentes ; cohérence avec fiche produit
Règles métier | Une seule version active à la fois ; validation horodatée
Erreurs / cas limites | Mention manquante ; origine trompeuse ; version non cohérente
Priorité | MVP

[TABLE 16]
Champ | Contenu
Module | M7
Utilisateurs concernés | Valideur mise en marché, conformité, qualité
Objectif | Décider du statut commercial d’un produit/lot
Point d’entrée | Depuis lot fini prêt pour validation
Résultat attendu | Conforme / Conforme sous réserve / Non conforme
Champs / données principales | Checklist réglementaire, pièces de preuve, statut approvisionnement, statut réception, statut transformation, étiquetage, traçabilité, incidents, commentaire final
Actions utilisateur | Décider ; signer/viser ; enregistrer réserves ; bloquer ; renvoyer en correction
Validations | Toutes les rubriques obligatoires doivent être remplies
Règles métier | Aucun produit ne peut être ouvert commercialement sans décision explicite
Erreurs / cas limites | Pièces manquantes ; rôle non autorisé ; décision contradictoire
Priorité | MVP

[TABLE 17]
Champ | Contenu
Module | M9
Utilisateurs concernés | Référent commercial, coordination
Objectif | Suivre les leads, prospects, acheteurs et opportunités
Point d’entrée | Menu CRM
Résultat attendu | Fiche opportunité, création commande, relances
Champs / données principales | Acheteur, produit, statut pipeline, source, montant estimé, prochaine action, responsable
Actions utilisateur | Créer ; qualifier ; planifier relance ; clôturer gagné/perdu ; convertir en commande
Validations | Le produit lié doit être commercialisable
Règles métier | On ne peut ouvrir une opportunité produit que pour un produit validé marché
Erreurs / cas limites | Produit non valide ; statut incohérent ; acheteur incomplet
Priorité | V2

[TABLE 18]
Champ | Contenu
Module | M9/M10
Utilisateurs concernés | Commercial, logistique, coordination
Objectif | Créer et suivre une commande jusqu’à la livraison
Point d’entrée | Depuis opportunité gagnée ou création directe
Résultat attendu | Commande confirmée puis expédiée
Champs / données principales | Client, références, lots réservés, quantités, prix, statut, dates, documents de vente/transport
Actions utilisateur | Confirmer ; réserver lot ; préparer ; expédier ; signaler litige
Validations | Stock disponible ; lot commercialisable ; informations client suffisantes
Règles métier | Seuls des lots conformes peuvent être réservés
Erreurs / cas limites | Stock insuffisant ; lot bloqué ; commande incomplète
Priorité | V2

[TABLE 19]
Champ | Contenu
Module | M10
Utilisateurs concernés | Référent logistique, qualité
Objectif | Piloter les niveaux de stock, réservations, blocages et mouvements
Point d’entrée | Menu Stocks
Résultat attendu | Vue consolidée et historique des mouvements
Champs / données principales | Lot, emplacement, quantité dispo, réservée, bloquée, statut, dernier mouvement
Actions utilisateur | Filtrer ; transférer ; bloquer ; débloquer ; réserver ; exporter
Validations | Rôle requis pour mouvements sensibles
Règles métier | Un lot bloqué n’est pas réservable
Erreurs / cas limites | Mouvement invalide ; quantité insuffisante
Priorité | V2

[TABLE 20]
Champ | Contenu
Module | M10
Utilisateurs concernés | Logistique, commercial
Objectif | Préparer et suivre une expédition
Point d’entrée | Depuis commande préparée
Résultat attendu | Expédition tracée, statut actualisé
Champs / données principales | Commande, colis/lots, destinataire, transporteur, documents, statut expédition, preuve de livraison
Actions utilisateur | Préparer ; imprimer documents ; expédier ; enregistrer preuve ; clôturer
Validations | Commande prête ; lots réservés ; documents complets
Règles métier | Une expédition doit référencer les lots exacts embarqués
Erreurs / cas limites | Document manquant ; lot non réservable ; expédition doublonnée
Priorité | V2

[TABLE 21]
Champ | Contenu
Module | M11
Utilisateurs concernés | Qualité, conformité, logistique, coordination
Objectif | Déclarer et suivre les incidents ou non-conformités
Point d’entrée | Depuis menu Incidents ou depuis un objet lié
Résultat attendu | Dossier incident avec action corrective
Champs / données principales | Type incident, gravité, objet lié, description, action corrective, responsable, échéance, statut
Actions utilisateur | Créer ; escalader ; assigner ; clore ; lier à décision marché
Validations | Objet lié obligatoire pour certains types ; responsable obligatoire
Règles métier | Les incidents critiques peuvent bloquer automatiquement la mise en marché ou l’expédition
Erreurs / cas limites | Incident incomplet ; statut incohérent
Priorité | V2

[TABLE 22]
Champ | Contenu
Module | M12
Utilisateurs concernés | Direction projet, coordination, partenaires en lecture
Objectif | Produire des KPI et rapports exportables
Point d’entrée | Menu Reporting
Résultat attendu | Tableaux de bord, exports PDF/Excel/CSV
Champs / données principales | Période, filière, bénéficiaire, produit, statut, volumes, commandes, incidents, validations
Actions utilisateur | Filtrer ; enregistrer vue ; exporter ; partager
Validations | Aucune métier hors habilitation
Règles métier | Les données diffusées dépendent du rôle
Erreurs / cas limites | Temps de génération ; absence de données
Priorité | V2

[TABLE 23]
Champ | Contenu
Module | M13
Utilisateurs concernés | Administrateur, auditeur
Objectif | Administrer les accès et consulter les journaux
Point d’entrée | Menu Administration
Résultat attendu | Utilisateurs actifs, rôles, historiques d’actions
Champs / données principales | Utilisateur, rôle, dernier accès, statut, actions sensibles, filtres audit
Actions utilisateur | Créer utilisateur ; affecter rôle ; suspendre ; consulter journal ; exporter logs
Validations | Rôle admin requis
Règles métier | Les actions sensibles doivent rester non modifiables dans l’audit log
Erreurs / cas limites | Conflit de rôles ; tentative d’accès refusée
Priorité | MVP

[TABLE 24]
Epic | Nom | Contenu
EPIC 1 | Socle applicatif | Authentification, rôles, paramètres, audit, dashboard
EPIC 2 | Bénéficiaires | Liste, fiche, diagnostic, pièces et statuts
EPIC 3 | Produits | Liste, fiche produit, documents, versions
EPIC 4 | Approvisionnement | Partenaires, contrats, pièces amont
EPIC 5 | Réception et lots entrants | Création lot, contrôles, réserves, rejets
EPIC 6 | Transformation et lots finis | Ordres de transformation, lots sortants, qualité
EPIC 7 | Étiquetage et validation marché | Version étiquette, checklist, décision marché
EPIC 8 | CRM et commandes | Prospects, opportunités, commandes
EPIC 9 | Stocks et logistique | Réservations, mouvements, expéditions
EPIC 10 | Incidents et reporting | Incidents, KPI, exports et financeurs

[TABLE 25]
ID | User story | Priorité
US-MVP-01 | En tant qu’administrateur, je peux créer des rôles et utilisateurs pour sécuriser l’accès à l’application. | Must
US-MVP-02 | En tant que coordinateur, je peux créer et suivre un bénéficiaire avec son statut et ses pièces. | Must
US-MVP-03 | En tant que référent produit, je peux créer une fiche produit complète et versionnée. | Must
US-MVP-04 | En tant que référent approvisionnement, je peux rattacher un contrat amont à un produit ou une matière. | Must
US-MVP-05 | En tant que référent réception, je peux créer un lot entrant et enregistrer les contrôles de réception. | Must
US-MVP-06 | En tant qu’opérateur transformation, je peux enregistrer une opération de transformation et créer un lot fini. | Must
US-MVP-07 | En tant que référent conformité, je peux valider ou rejeter une version d’étiquette. | Must
US-MVP-08 | En tant que valideur, je peux prendre une décision de mise en marché horodatée et tracée. | Must
US-MVP-09 | En tant qu’utilisateur habilité, je peux consulter la chaîne de traçabilité d’un lot. | Must
US-MVP-10 | En tant qu’administrateur ou auditeur, je peux consulter l’audit log des actions sensibles. | Must
US-MVP-11 | En tant que coordinateur, je peux voir un tableau de bord synthétique et exporter des données clés. | Should
US-MVP-12 | En tant qu’utilisateur, je peux joindre et consulter des pièces justificatives par objet métier. | Must

[TABLE 26]
ID | User story | Lot
US-V2-01 | En tant que commercial, je peux gérer des prospects, opportunités et relances. | V2
US-V2-02 | En tant que logistique, je peux réserver des lots et préparer une expédition. | V2
US-V2-03 | En tant que coordinateur, je peux suivre les incidents et actions correctives. | V2
US-V2-04 | En tant que direction projet, je peux produire des tableaux de bord financeurs. | V2
US-V3-01 | En tant qu’acheteur, je peux accéder à un portail dédié. | V3
US-V3-02 | En tant qu’utilisateur, je reçois des notifications enrichies multicanales. | V3
US-V3-03 | En tant que direction, je bénéficie d’un scoring et d’analyses avancées. | V3
