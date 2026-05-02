# Onboarding Seller -- Guide Agent MCH Terrain

> BETA-PRIVEE -- Processus d'onboarding terrain pour les agents MCH.

## Vue d'ensemble du flux

```
Agent MCH terrain  -->  Rencontre seller  -->  Collecte docs  -->  Creation compte
     |                                                                    |
     v                                                                    v
Seller recoit SMS/WhatsApp  <--  Envoi credentials  <--  Profil cree dans IOX
     |
     v
Seller se connecte  -->  Complete profil  -->  Ajoute produits  -->  Publie vitrine
```

1. L'agent MCH rencontre le seller sur le terrain
2. Collecte les documents requis (piece d'identite, registre commerce, certifications)
3. Cree le compte seller dans l'admin IOX
4. Envoie les credentials au seller par SMS/WhatsApp
5. Le seller se connecte et complete son profil en autonomie

## Checklist 10 points par seller

- [ ] **1. Verification identite** -- Piece d'identite du gerant (CNI ou passeport)
- [ ] **2. Registre commerce** -- Extrait KBIS ou equivalent local (< 3 mois)
- [ ] **3. Coordonnees bancaires** -- RIB ou IBAN pour les versements Stripe Connect
- [ ] **4. Photos produits** -- Minimum 3 photos par produit principal (smartphone OK)
- [ ] **5. Fiche technique** -- Description produit, conditionnement, DLC/DLUO
- [ ] **6. Certifications** -- Bio, HACCP, GlobalGAP, Fairtrade (copies scannees)
- [ ] **7. Creation compte** -- Via `/admin/users` : email, role MARKETPLACE_SELLER
- [ ] **8. Creation Company** -- Via `/admin` ou seed : code, nom, pays YT
- [ ] **9. Rattachement profil** -- Lier le SellerProfile au User via slug
- [ ] **10. Envoi credentials** -- SMS/WhatsApp avec lien login + mot de passe temporaire

## Script d'invitation

```bash
# Generer les instructions d'invite pour un seller
./deploy/scripts/generate-seller-invite.sh seller@example.com "Nom du Seller" demo-seller-slug
```

Le script affiche :
- Les etapes a suivre pour l'agent
- Les URLs a communiquer au seller
- Les messages pre-formates (FR + Shimaore)

## Templates de communication

### Email de bienvenue (FR)

> Sujet : Bienvenue sur IOX Marketplace, {nom} !
>
> Bonjour {nom},
>
> Bienvenue sur IOX Marketplace -- la plateforme de mise en relation des producteurs
> de l'Ocean Indien avec les acheteurs internationaux.
>
> Votre compte vendeur a ete cree avec succes. Pour commencer a vendre vos produits,
> completez votre profil : {url_onboarding}
>
> Etapes suivantes :
> 1. Completez les informations de votre entreprise
> 2. Ajoutez vos produits et leurs fiches techniques
> 3. Configurez vos offres et conditions de vente
> 4. Publiez votre vitrine sur la marketplace

### Email de bienvenue (EN)

> Subject: Welcome to IOX Marketplace, {name}!
>
> Hello {name},
>
> Welcome to IOX Marketplace -- the platform connecting Indian Ocean producers
> with international buyers.
>
> Your seller account has been created successfully. To start selling your products,
> complete your profile: {onboarding_url}

### SMS/WhatsApp (FR)

> Bonjour {nom}, bienvenue sur IOX Marketplace !
> Votre compte a ete cree. Connectez-vous ici :
> {url_login}
> Email : {email}
> Mot de passe temporaire : (communique separement)
> Puis completez votre profil : {url_onboarding}

### SMS (Shimaore)

> Karibu {nom} ! Wafikia IOX Marketplace.
> Ingia hapa: {url_login}

## Notes operationnelles

- **Mot de passe temporaire** : communiquer separement du lien (canal different si possible)
- **Telephone** : privilegier WhatsApp pour le suivi (accusé de reception, photos)
- **Suivi J+3** : rappeler le seller s'il ne s'est pas connecte sous 3 jours
- **Suivi J+7** : deuxieme relance si profil incomplet
- **Escalade** : si le seller ne repond pas apres J+7, noter dans le CRM et passer au suivant
