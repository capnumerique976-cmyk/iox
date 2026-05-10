DOSSIER DE RECETTE FONCTIONNELLE
Application IOX – Cas de test, scénarios métier et grille de validation
Version DOCX destinée à l’équipe projet, aux développeurs et aux recetteurs

# 1. Objectifs de la recette fonctionnelle

• Vérifier que les écrans et workflows sont conformes aux spécifications détaillées.
• Vérifier que les règles métier et validations critiques sont correctement implémentées.
• S’assurer que les rôles et droits d’accès sont respectés.
• Garantir la traçabilité des décisions sensibles, en particulier la validation de mise en marché.
• Identifier les écarts, anomalies, incohérences et régressions avant recette finale et mise en production.

# 2. Principes généraux de recette

• Chaque cas de test doit comporter un identifiant unique, un prérequis, des données de test, des étapes, un résultat attendu et un statut de recette.
• Les cas de test critiques doivent être rejoués à chaque version avant validation d’un lot.
• Les scénarios métier transverses doivent être testés en plus des tests écran par écran.
• La recette doit distinguer clairement : conforme, conforme sous réserve, non conforme / bloquant.
• Les anomalies doivent être qualifiées par criticité : mineure, majeure, bloquante.

# 3. Statuts et criticités de recette

# 4. Environnement et jeux de données de test

# 5. Cas de test écran par écran

La matrice suivante sert de base de couverture. Les cas détaillés sont fournis ensuite.

# 6. Cas de test détaillés – MVP

# 7. Cas de test détaillés – V2 (préparatoires)

# 8. Scénarios métier transverses

# 9. Fiche de validation d’un lot de recette

# 10. Gestion des anomalies

Une anomalie est considérée comme bloquante si elle empêche :
• la création ou la validation correcte d’un objet métier critique ;
• la prise de décision de mise en marché ;
• la traçabilité d’un lot ;
• le respect des droits et rôles ;
• l’auditabilité d’une action sensible.

# 11. Checklist de go/no-go avant mise en production MVP

# 12. Conclusion

Le présent dossier de recette fonctionnelle fournit une base directement exploitable pour préparer, exécuter et documenter la recette d’IOX. Il doit être utilisé conjointement avec le dossier d’étude technique, les spécifications détaillées, le backlog et les maquettes fonctionnelles.
Fin du document.

[TABLE 1]
Objet : fournir un plan de recette fonctionnelle complet, directement exploitable pour tester l’application IOX écran par écran, valider les règles métier critiques et sécuriser la mise en production du MVP puis des lots suivants.

[TABLE 2]
Champ | Contenu
Projet | IOX au service du programme MCH
Périmètre de recette | MVP en priorité ; scénarios V2 inclus à titre préparatoire
Destinataires | Développeurs, QA, chef de projet, référents métier, coordination ADAAM, valideurs
Version | V1

[TABLE 3]
Élément | Valeurs recommandées
Statut de test | À tester / En cours / Conforme / Conforme sous réserve / Non conforme
Criticité anomalie | Mineure / Majeure / Bloquante
Décision de lot | Validé / Validé sous réserve / Refusé

[TABLE 4]
Champ | Contenu
Environnement | Préproduction / environnement de recette stabilisé
Comptes de test | 1 administrateur, 1 coordinateur ADAAM, 1 référent accompagnement, 1 référent approvisionnement, 1 opérateur transformation, 1 référent conformité, 1 référent logistique, 1 référent commercial, 1 auditeur, 1 profil lecture seule
Jeux de données minimaux | 3 bénéficiaires, 5 produits, 2 partenaires amont, 2 contrats, 3 lots entrants, 2 opérations de transformation, 3 lots finis, 1 incident, 2 opportunités, 1 commande
Scénarios obligatoires | 1 cas conforme, 1 cas sous réserve, 1 cas bloquant

[TABLE 5]
ID | Écran | Point principal à tester | Priorité
E01 | Tableau de bord principal | Affichage des KPI et alertes par rôle | MVP
E02 | Liste bénéficiaires | Filtres, recherche, navigation, statut | MVP
E03 | Fiche bénéficiaire | Création, édition, pièces, activation | MVP
E04 | Liste produits | Recherche, statuts documentaires et marché | MVP
E05 | Fiche produit | Création, versioning, contrôle champs critiques | MVP
E06 | Liste partenaires | Création, recherche, filtres | MVP
E07 | Fiche contrat amont | Activation, dates, pièces, cohérence | MVP
E08 | Création lot entrant | Réception matière, documents, contrôles | MVP
E09 | Fiche lot entrant | Réserve, rejet, lien traçabilité | MVP
E10 | Ordre transformation | Quantités, clôture, création lot fini | MVP
E11 | Fiche lot transformé | Pré-requis de validation marché | MVP
E12 | Validation étiquetage | Mentions, version active, rejet | MVP
E13 | Décision mise en marché | Conforme / réserve / blocage | MVP
E14 | Liste opportunités | Pipeline commercial | V2
E15 | Fiche commande | Réservation lots, statuts | V2
E16 | Stocks et mouvements | Réservation, blocage, transferts | V2
E17 | Expédition | Documents, lots embarqués, clôture | V2
E18 | Incidents | Ouverture, escalade, clôture | V2
E19 | Reporting | Filtres, exports, confidentialité | V2
E20 | Administration / audit | Rôles, utilisateurs, logs | MVP

[TABLE 6]
ID | Cas de test | Prérequis | Données de test | Étapes | Résultat attendu | Criticité
TC-MVP-01 | Connexion et affichage du tableau de bord par rôle | Compte utilisateur valide et connecté | Administrateur / Coordinateur / Lecture seule | Se connecter avec chaque rôle ; ouvrir le tableau de bord ; vérifier les widgets visibles ; ouvrir une alerte. | Le tableau de bord varie selon le rôle ; seules les données autorisées sont visibles ; les liens fonctionnent. | Critique
TC-MVP-02 | Création d’un bénéficiaire complet | Compte coordinateur ; aucune fiche existante | Nouveau bénéficiaire avec données minimales | Créer un bénéficiaire ; renseigner les champs obligatoires ; enregistrer ; vérifier présence en liste. | Le bénéficiaire est créé avec le statut attendu et visible dans la liste. | Critique
TC-MVP-03 | Activation d’un bénéficiaire avec dossier incomplet | Bénéficiaire créé mais pièces minimales absentes | Bénéficiaire incomplet | Ouvrir fiche ; tenter d’activer le bénéficiaire. | Le système bloque l’activation et signale les éléments manquants. | Critique
TC-MVP-04 | Création d’une fiche produit avec champs critiques | Bénéficiaire actif | Produit de test | Créer un produit ; renseigner catégorie, origine, lieu de transformation, packaging ; enregistrer. | La fiche produit est enregistrée et version initiale créée. | Critique
TC-MVP-05 | Demande de validation documentaire avec produit incomplet | Produit brouillon incomplet | Produit sans origine ou sans lieu de transformation | Cliquer sur demande de validation documentaire. | La demande est refusée et le système affiche les champs manquants. | Critique
TC-MVP-06 | Création et activation d’un contrat amont | Partenaire amont créé | Contrat avec pièce jointe | Créer le contrat ; saisir dates ; joindre document ; activer. | Le contrat passe Actif uniquement si les champs requis et la pièce sont présents. | Critique
TC-MVP-07 | Création d’un lot entrant conforme | Contrat amont actif | Lot avec documents complets | Créer lot entrant ; lier le partenaire ; joindre documents ; saisir quantité ; enregistrer contrôle. | Le lot est créé et peut être marqué conforme selon la décision de réception. | Critique
TC-MVP-08 | Création d’un lot entrant avec contrat absent | Aucun contrat actif | Lot sans base contractuelle | Tenter de créer ou valider la réception d’un lot entrant. | Le système bloque la validation conforme et signale l’absence de contrat actif. | Critique
TC-MVP-09 | Transformation d’un lot entrant conforme | Lot entrant conforme disponible | Ordre de transformation standard | Créer ordre de transformation ; saisir quantité engagée et quantité sortie ; clôturer. | Le lot transformé est créé et lié au lot entrant. | Critique
TC-MVP-10 | Transformation avec quantité sortie > quantité engagée | Lot entrant conforme | Quantité incohérente | Saisir une quantité sortie supérieure à la quantité engagée ; tenter de clôturer. | Le système bloque et signale l’incohérence. | Critique
TC-MVP-11 | Validation d’étiquetage conforme | Produit complet + maquette étiquette | Version étiquette 1 | Ouvrir écran validation étiquetage ; valider. | La version est validée, horodatée et devient version active. | Critique
TC-MVP-12 | Validation d’étiquetage avec mention obligatoire absente | Produit + étiquette incomplète | Version étiquette incomplète | Tenter de valider l’étiquette. | Le système refuse la validation et affiche l’élément manquant. | Critique
TC-MVP-13 | Décision de mise en marché – Conforme | Lot fini avec tous prérequis satisfaits | Lot prêt marché | Ouvrir écran décision ; contrôler checklist ; choisir Conforme ; enregistrer. | La décision est enregistrée, horodatée, signée/visée et le lot devient commercialisable. | Critique
TC-MVP-14 | Décision de mise en marché – Conforme sous réserve | Lot avec réserve non bloquante | Lot sous réserve | Ouvrir écran décision ; choisir Conforme sous réserve ; renseigner réserve et échéance. | La décision est enregistrée avec réserve obligatoire et visibilité de la réserve. | Critique
TC-MVP-15 | Décision de mise en marché – Non conforme / blocage | Lot non éligible | Lot non traçable ou document incomplet | Ouvrir écran décision ; choisir Non conforme / blocage ; renseigner motif. | Le lot est bloqué pour toute commercialisation et l’audit log est alimenté. | Critique
TC-MVP-16 | Audit log des validations sensibles | Au moins une décision de mise en marché prise | Historique d’actions | Se connecter en admin/auditeur ; ouvrir audit log ; filtrer sur décisions marché. | Toutes les décisions apparaissent avec date, utilisateur, objet, statut et commentaire. | Critique
TC-MVP-17 | Droits d’accès lecture seule | Compte lecture seule actif | Utilisateur lecture seule | Se connecter ; consulter listes et fiches ; tenter de modifier ou valider. | Les vues autorisées sont accessibles ; les actions interdites sont absentes ou bloquées. | Critique
TC-MVP-18 | Export reporting MVP | Données présentes | Période de test | Ouvrir reporting ; filtrer ; exporter en Excel ou PDF. | L’export est généré et reflète les filtres appliqués. | Important

[TABLE 7]
ID | Cas de test | Attendu | Criticité
TC-V2-01 | Création d’une opportunité uniquement avec produit commercialisable | Le système refuse un produit non validé marché. | Majeure
TC-V2-02 | Création d’une commande avec lots réservables | Seuls les lots conformes et disponibles peuvent être réservés. | Majeure
TC-V2-03 | Blocage d’expédition si lot bloqué | Le système empêche l’expédition de lots non éligibles. | Majeure
TC-V2-04 | Création et clôture d’un incident | L’incident suit son cycle et peut impacter un lot ou une commande. | Majeure
TC-V2-05 | Confidentialité du reporting selon le rôle | Le contenu visible varie selon le profil connecté. | Importante

[TABLE 8]
ID scénario | Nom | Parcours | Résultat attendu
SC-01 | Flux conforme de bout en bout | Créer bénéficiaire actif → créer produit complet → activer contrat amont → créer lot entrant conforme → transformer → valider étiquetage → décision Conforme → (si V2) créer opportunité/commande. | Le flux se déroule sans blocage et tous les statuts sont cohérents.
SC-02 | Flux bloqué pour absence de contrat amont | Créer produit → tenter réception matière sans contrat actif. | Le lot ne peut pas être validé conforme et ne peut pas entrer dans la transformation.
SC-03 | Flux bloqué pour étiquette non validée | Créer lot fini → demander validation marché sans étiquette validée. | La décision Conforme est impossible.
SC-04 | Flux sous réserve | Préparer lot fini avec réserve non bloquante → prendre décision Conforme sous réserve. | Le lot obtient un statut marché conditionnel avec réserve tracée.
SC-05 | Incident critique impactant le marché | Créer incident critique sur lot validé marché. | Le lot est signalé, et selon la règle retenue, son usage commercial est bloqué ou soumis à revue.

[TABLE 9]
Champ | Contenu
Lot de recette / version |
Périmètre testé |
Date de recette |
Recetteurs |
Nombre de cas conformes |
Nombre de cas sous réserve |
Nombre de cas non conformes |
Décision finale | Validé / Validé sous réserve / Refusé
Commentaires |

[TABLE 10]
Champ | Règle recommandée
ID anomalie | Identifiant unique obligatoire
Écran / scénario lié | Toujours renseigné
Description | Fait observé + fait attendu
Criticité | Mineure / Majeure / Bloquante
Reproductibilité | Toujours / Intermittent / Non reproduit
Statut | Ouverte / En correction / Corrigée / Rejetée / Re-testée / Clôturée
Pièces | Capture, log, données de test si possible

[TABLE 11]
Point de contrôle | Validation
Les écrans MVP E01 à E13 et E20 sont testés | [ ] Oui [ ] Non
Les cas de test critiques TC-MVP-01 à TC-MVP-17 sont conformes | [ ] Oui [ ] Non
Le scénario SC-01 (flux conforme) est validé | [ ] Oui [ ] Non
Le scénario SC-02 (absence contrat) est bloquant comme prévu | [ ] Oui [ ] Non
Le scénario SC-03 (étiquette non validée) est bloquant comme prévu | [ ] Oui [ ] Non
Le scénario SC-04 (conforme sous réserve) fonctionne | [ ] Oui [ ] Non
L’audit log restitue correctement les actions sensibles | [ ] Oui [ ] Non
Les droits lecture seule et rôles sensibles sont conformes | [ ] Oui [ ] Non
Les exports MVP sont utilisables | [ ] Oui [ ] Non
Aucune anomalie bloquante ouverte | [ ] Oui [ ] Non
