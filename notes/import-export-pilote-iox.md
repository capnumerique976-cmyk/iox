# Import / Export — Phase Pilote IOX

> Document décrivant les capacités d'import et d'export de données pendant la phase pilote.
> Audience : administrateur plateforme, équipe terrain.
> Date : 2026-05-11

---

## 1. Exports disponibles

### 1.1 Factures PDF

**Statut : disponible.**

Les factures acheteur et vendeur sont générables directement depuis l'interface utilisateur :

- **Acheteur** : tableau de bord acheteur > onglet **Commandes / Paiements** > bouton **Télécharger la facture**.
- **Vendeur** : tableau de bord vendeur > onglet **Ventes** > bouton **Télécharger la facture**.
- **Admin** : `/admin/rfq/[id]` > bouton **Télécharger la facture**.

Format : PDF, généré à la demande, horodaté, avec logo IOX.

---

### 1.2 Export RFQ — non disponible pour le pilote

**Statut : non implémenté — prévu post-pilote.**

L'interface admin ne propose pas encore d'export CSV ou Excel de la liste des demandes de devis. Pour les besoins ponctuels du pilote, utiliser les requêtes SQL de la section 4.

---

### 1.3 Export liste vendeurs — non disponible pour le pilote

**Statut : non implémenté — prévu post-pilote.**

Pas d'export de la liste des vendeurs depuis l'interface admin. Utiliser la requête SQL de la section 4 pour un export ponctuel en lecture seule.

---

### 1.4 Export catalogue produits — non disponible pour le pilote

**Statut : non implémenté — prévu post-pilote.**

Les vendeurs ne peuvent pas exporter leur catalogue produits au format CSV depuis l'interface. Fonctionnalité prévue dans la roadmap post-pilote.

---

### 1.5 Export paiements CSV — non disponible pour le pilote

**Statut : non implémenté — prévu post-pilote.**

Il n'existe pas d'export CSV ou Excel des paiements depuis l'interface admin. La requête SQL de la section 4.3 permet un export ponctuel.

---

## 2. Import de données — Politique pilote

**Aucun import automatique de données n'est prévu pour la phase pilote.**

Raisons :

- Risque élevé d'introduction de données incorrectes, dupliquées ou mal formatées.
- Absence de validation et de mapping automatique robustes.
- Volume pilote faible (~5 coopératives, ~10 acheteurs) : la saisie manuelle via l'interface est gérable.

**Méthode retenue** : toutes les données sont saisies manuellement via l'interface utilisateur (produits, profils, RFQ), assistées si besoin par l'administrateur plateforme.

**Alternative d'urgence** : en cas de besoin urgent d'import batch (ex. : coopérative avec catalogue de plus de 50 produits), Prisma Studio peut être utilisé par un développeur habilité, uniquement en coordination avec le responsable technique.

---

## 3. Templates CSV disponibles — Référence future

Ces templates sont documentés à titre de référence pour la phase post-pilote. Les fichiers CSV correspondants seront stockés dans `exports/templates/` à l'issue du pilote.

### 3.1 `produits-vendeur.csv` — catalogue coopérative

**Chemin prévu** : `exports/templates/produits-vendeur.csv`

| Colonne | Description | Exemple |
|---|---|---|
| `nom` | Nom commercial du produit | Vanille Bourbon de Mayotte |
| `description` | Description détaillée | Vanille noire séchée, arôme intense |
| `categorie` | Catégorie produit | Épices et aromates |
| `prix_indicatif` | Prix indicatif en EUR | 85.00 |
| `unite` | Unité de vente | kg |
| `quantite_disponible` | Stock disponible | 250 |
| `certifications` | Labels et certifications (séparés par `\|`) | Agriculture biologique\|Commerce équitable |
| `origine` | Origine géographique | Mayotte |
| `photos_url` | URLs des photos (séparées par `\|`) | https://cdn.iox.re/img/vanille1.jpg |

---

### 3.2 `acheteurs-pilote.csv` — acheteurs à inviter

**Chemin prévu** : `exports/templates/acheteurs-pilote.csv`

| Colonne | Description | Exemple |
|---|---|---|
| `entreprise` | Nom de l'entreprise acheteuse | Épicerie Fine de La Réunion SARL |
| `contact_nom` | Nom du contact principal | Marie Dupont |
| `contact_email` | Email du contact | m.dupont@epicerie-reunion.re |
| `contact_tel` | Téléphone | +262 692 000 000 |
| `pays` | Pays de l'acheteur | La Réunion |
| `secteur` | Secteur d'activité | Distribution alimentaire |
| `besoins_principaux` | Produits recherchés | Épices, fruits tropicaux, vanille |

---

### 3.3 `vendeurs-pilote.csv` — coopératives participantes

**Chemin prévu** : `exports/templates/vendeurs-pilote.csv`

| Colonne | Description | Exemple |
|---|---|---|
| `cooperative` | Nom de la coopérative | COOPAGRI Mayotte |
| `contact_nom` | Nom du responsable commercial | Jean Salim |
| `contact_email` | Email du responsable | j.salim@coopagri-mayotte.fr |
| `contact_tel` | Téléphone mobile | +262 639 000 000 |
| `siret` | Numéro SIRET | 12345678900012 |
| `adresse` | Adresse siège social | Zone artisanale, Mamoudzou, 97600 |
| `produits_principaux` | Produits proposés | Vanille, ylang-ylang, fruits |
| `certifications` | Certifications détenues | AB, Ecocert |

---

## 4. Requêtes SQL export — Admin (SELECT uniquement)

Ces requêtes sont en lecture seule et sont sûres à exécuter sur la base de production pilote. **Ne jamais exécuter de requêtes `UPDATE`, `DELETE` ou `INSERT` sans sauvegarde préalable.**

### 4.1 Export vendeurs avec nombre de produits publiés

```sql
-- Export vendeurs avec nb produits
SELECT s.id, s."companyName", s."contactEmail",
       COUNT(mo.id) AS nb_produits_publies,
       s."createdAt"
FROM sellers s
LEFT JOIN marketplace_offers mo ON mo."sellerId" = s.id AND mo.status = 'PUBLISHED'
GROUP BY s.id ORDER BY nb_produits_publies DESC;
```

---

### 4.2 Export RFQ avec statuts

```sql
-- Export RFQ avec statuts
SELECT qr.id, qr.status, qr."createdAt",
       mo.title AS produit,
       s."companyName" AS vendeur
FROM quote_requests qr
JOIN marketplace_offers mo ON mo.id = qr."marketplaceOfferId"
JOIN sellers s ON s.id = mo."sellerId"
ORDER BY qr."createdAt" DESC;
```

---

### 4.3 Export paiements confirmés

```sql
-- Export paiements confirmés
SELECT p.id, p.amount/100.0 AS montant_eur, p.currency,
       p.status, p."createdAt"
FROM payments p
WHERE p.status = 'SUCCEEDED'
ORDER BY p."createdAt" DESC;
```

---

## 5. Procédure import produits — Assistance admin

En l'absence d'import automatique, voici la procédure pour aider une coopérative à saisir ses produits :

1. **Admin reçoit le CSV rempli** par la coopérative (format `produits-vendeur.csv`).
2. **Admin se connecte au compte vendeur** de la coopérative ou guide le représentant par visio.
3. **Admin crée les produits** via l'interface `/seller/marketplace-products/new` — un produit à la fois.
4. **Vérification** : l'admin vérifie depuis `/admin` que le produit est bien publié et indexé dans MeiliSearch.
5. **Alternative batch** : si le volume est urgent (>20 produits), Prisma Studio peut être utilisé par le développeur désigné pour insérer les données directement en base, après validation du responsable technique.

---

## 6. Post-pilote — Fonctionnalités import/export planifiées

| Fonctionnalité | Priorité | Description |
|---|---|---|
| Export CSV RFQ (admin) | Haute | Export filtré des demandes de devis depuis l'interface admin |
| Export CSV vendeurs | Haute | Liste complète avec statuts et KPIs |
| Export CSV paiements | Haute | Export comptable des transactions (compatible EBP, Sage) |
| Import CSV produits | Moyenne | Import en masse du catalogue vendeur par les coopératives |
| Export factures groupées | Moyenne | Téléchargement ZIP de toutes les factures d'une période |
| API REST partenaires | Basse | Webhooks sortants vers les ERP des acheteurs et intégrations tiers |
| Import acheteurs en masse | Basse | Import CSV pour onboarding groupé d'acheteurs |

---

*Document créé : M92 — 2026-05-11*
*Prochaine révision : après pilote terrain (estimé juillet 2026)*
