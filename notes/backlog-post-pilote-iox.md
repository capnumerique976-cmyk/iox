# Backlog Post-Pilote — IOX

**Version :** M98 / Mai 2026
**Usage :** Roadmap produit post-validation pilote. À reprioriser après retours terrain.
**Statut actuel :** Pilote fermé non encore lancé (infrastructure à provisionner)

---

> Ce backlog est indicatif. Les priorités définitives seront ajustées après les retours des coopératives et des acheteurs pilotes. Les items **URGENT** bloquent le passage en production publique.

---

## URGENT — Pré-production publique (Trimestre 1 post-pilote)

Prérequis non négociables avant toute ouverture au grand public.

| Item | Effort estimé | Dépendance |
|---|---|---|
| Activation Stripe live (paiements réels) | 1 jour | KYC vendeurs validés, compte Stripe business vérifié |
| RGPD finalisation (remplir tous les champs [À compléter]) | 2-3 jours | DPO ou juriste désigné |
| VPS production provisionné (Ubuntu 22.04) + SSL + domaine officiel | 2-3 jours | Budget infrastructure |
| Monitoring Sentry configuré (backend et frontend) | 1 jour | — |
| UptimeRobot configuré (alertes downtime) | 2h | — |
| Backup cron actif et testé (restauration validée) | 1 jour | VPS opérationnel |
| CGU / mentions légales validées par juriste | 1 semaine | Juriste prestataire |
| Validation RGPD complète par DPO | Externe | DPO désigné |

---

## IMPORTANT — Trimestre 1 à 2 post-pilote

Fonctionnalités à développer dans les 3 à 6 mois suivant la validation du pilote, selon les retours terrain.

### Expérience mobile et notifications

- **Service Worker offline** : navigation du catalogue en mode hors-ligne (pages lecture seule, mise en cache des fiches produits). Utile pour les zones à connectivité faible en milieu agricole.
- **Notifications push PWA** : alertes instantanées pour nouvelles RFQ, réponses vendeurs, paiements confirmés. Compatibilité Android Chrome et iOS 16.4+.
- **Notifications WhatsApp / SMS pour RFQ urgentes** : intégration Twilio ou WhatsApp Business API. Les coopératives de Mayotte utilisent WhatsApp massivement — les emails ne suffisent pas pour les alertes critiques.

### Outils productivité vendeurs et admin

- **Import CSV produits en masse** : permettre aux coopératives avec plus de 20 produits d'importer leur catalogue depuis un fichier Excel ou CSV. Évite la saisie manuelle fastidieuse.
- **Export CSV / Excel des paiements** : export comptable des transactions compatible avec les logiciels courants (EBP, Sage, Excel). Fonctionnalité fréquemment demandée par les coopératives.

### Confiance, qualité et logistique

- **Scoring confiance vendeurs** : score de fiabilité visible sur les fiches vendeur, basé sur les certifications, l'historique de transactions, le délai moyen de réponse et le taux de satisfaction acheteurs.
- **Suggestions logistiques** : proposer des transitaires ou prestataires logistiques partenaires pour les transactions impliquant de l'export depuis Mayotte. IOX ne gère pas la logistique mais facilite la mise en relation.

---

## CONFORT — Trimestre 2 à 3 post-pilote

Fonctionnalités qui améliorent l'expérience sans être critiques pour la croissance initiale.

### Mobile natif

- **Application mobile native** (React Native ou Capacitor) : si la PWA montre des limitations terrain sur iOS (notifications push restreintes, installation complexe), développer une app native. Décision à prendre après 3 mois d'usage de la PWA.

### Analytics et intelligence

- **Analytics avancées** : heatmaps (Hotjar ou Clarity), entonnoir de conversion catalogue → RFQ → paiement, taux de rebond par page. Identifier les points de friction dans le parcours utilisateur.
- **Recommandations produits** : suggestions personnalisées ("Vous avez cherché vanille — vous pourriez aimer...") basées sur l'historique de navigation. ML simple, collaborative filtering ou filtrage par contenu.

### Internationalisation

- **Multilingue anglais complet** : l'interface est actuellement partiellement disponible en anglais. Finaliser toutes les traductions pour les acheteurs anglophones (Grande-Bretagne, USA, Moyen-Orient, Afrique anglophone).

### Juridique et contractuel

- **Litiges et médiation intégrés** : processus structuré pour gérer les désaccords acheteur / vendeur (qualité non conforme, retard, annulation). Actuellement géré manuellement par le support IOX.
- **Contrats PDF générés automatiquement** : à partir d'un devis accepté, générer un bon de commande ou contrat de vente PDF signable électroniquement. Valeur légale et comptable pour les deux parties.

### Galerie médias

- **Galerie photos optimisée** : compression automatique à l'upload, intégration CDN (Cloudflare Images ou Imgix) pour servir les photos redimensionnées selon l'appareil. Améliore les performances mobile en zone à faible débit.

---

## LONG TERME — Année 2 et au-delà

Vision produit à moyen terme, conditionnelle à la validation commerciale du modèle.

### API et intégrations

- **API publique pour ERP et logistique partenaires** : permettre à des ERP (Sage, SAP, Cegid), des plateformes logistiques ou des systèmes douaniers de s'intégrer directement avec IOX via des webhooks et endpoints REST documentés.

### Expansion géographique

- **Marketplace multi-régions** : étendre IOX à La Réunion, Madagascar, Comores, et potentiellement l'île Maurice. Répliquer le modèle Mayotte sur les autres îles de l'océan Indien. Architecture multi-tenant à prévoir.

### Durabilité et traçabilité avancée

- **Traçabilité blockchain (proof of concept)** : enregistrer les informations de traçabilité produit sur une blockchain publique ou semi-privée. Argument commercial fort sur les marchés européens soucieux de l'origine et de l'impact environnemental.
- **Scoring ESG fournisseurs** : noter les fournisseurs sur des critères environnementaux, sociaux et de gouvernance. Répond aux exigences croissantes des acheteurs institutionnels européens.

### Conformité et financement

- **Certification export automatisée** : générer automatiquement les documents requis à l'export (certificat phytosanitaire, certificat d'origine, EUR1) en pré-remplissant les informations du profil vendeur et de la fiche produit.
- **Financement commercial (crédit documentaire intégré)** : proposer des solutions de financement du commerce international (lettres de crédit, affacturage) en partenariat avec une banque ou un établissement de crédit. Lève le frein de trésorerie pour les coopératives.

---

## Critères de priorisation post-pilote

Les items seront reclassés après le pilote selon les critères suivants, par ordre de priorité :

1. **Demandes terrain explicites** : fonctionnalités explicitement demandées par les coopératives ou acheteurs pilotes lors des entretiens de suivi.
2. **Blocage commercial** : ce qui empêche concrètement une transaction de se finaliser.
3. **Réduction du support** : ce qui diminue le volume de sollicitations WhatsApp ou email au support IOX.
4. **Conformité réglementaire** : non négociable, toujours traité en priorité.
5. **Effort / impact** : favoriser les gains rapides (quick wins) en début de roadmap post-pilote.

---

*Dernière mise à jour : M98 — 2026-05-11*
*Prochaine révision prévue : après pilote terrain (estimé juillet 2026)*
