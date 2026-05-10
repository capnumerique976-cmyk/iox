# IOX — Checklist rendez-vous investisseur / client

**Date :** 2026-05-10  
**Public :** Investisseur, client potentiel, partenaire commercial ou technique

---

## AVANT le rendez-vous (J-1)

### Technique
- [ ] Backend démarré sur port 3001 : `cd apps/backend && node dist/main.js`
- [ ] Frontend démarré sur port 3000 : `cd apps/frontend && npm run dev`
- [ ] Seed démo lancé (idempotent) : `IOX_DEMO_SEED=1 npx tsx prisma/seed-demo.ts`
- [ ] Vérifier catalogue : `curl http://localhost:3001/api/v1/marketplace/catalog/stats` → `{"products":13,"sellers":9,"countries":1}`
- [ ] Tester login buyer : email `smoke-buyer@iox.mch` / mot de passe `IoxSmoke2026!`
- [ ] Tester login seller : email `smoke-seller@iox.mch` / mot de passe `IoxSmoke2026!`
- [ ] Ouvrir l'URL facture PDF et vérifier HTTP 200
- [ ] Désactiver les notifications système (ne pas distraire pendant la démo)
- [ ] Mode plein écran / résolution 1920×1080 recommandée
- [ ] Fermer les onglets inutiles — garder uniquement l'appli IOX ouverte

### Supports
- [ ] Imprimer ou envoyer en avance : `exports/iox-fiche-synthese.pdf`
- [ ] Deck prêt : `exports/iox-deck-investisseur.pdf` ou HTML
- [ ] Avoir la fiche synthèse en version papier si RDV physique
- [ ] Backup offline : screenshot du catalogue + facture PDF (si connexion incertaine)

### Logistique
- [ ] Confirmer le créneau et la durée (10 min = pitch / 20 min = démo complète)
- [ ] Préparer les réponses aux questions [HYPOTHÈSE] qu'on ne peut pas encore confirmer
- [ ] Compléter les `[À compléter]` dans les docs avant envoi (équipe, levée, contact)

---

## PENDANT le rendez-vous

### Ordre recommandé

#### A. Accroche (2 min)
> Parlez sans écran. Contexte Mayotte. Problème export. Solution IOX.  
> *Phrase clé :* "De la demande de devis à la facture signée, sans papier, sans intermédiaire."

**Ouvrir l'URL :** `http://localhost:3000/marketplace`

#### B. Catalogue (2 min)
- Montrer les 13 produits PUBLISHED
- Filtrer par catégorie (Épice → Vanille Bourbon)
- Cliquer sur **Vanille Bourbon de Mayotte — Grade A**
- Insister sur : 420 EUR/kg · FOB Mamoudzou · Certifié COSMOS NATURAL

#### C. Parcours Buyer — RFQ & Transaction (4 min)
- Login `smoke-buyer@iox.mch` → `/buyer/quote-requests`
- Montrer les **3 RFQ** :
  - `rfq-vanille-poudre-init` : **NEW** — demande fraîche
  - `rfq-mangue-maya-quoted` : **QUOTED** — devis 1 850 EUR/tonne reçu
  - `rfq-ylang-extra-won` : **WON ✅** — transaction complète
- Ouvrir le fil de discussion — montrer les 2 messages échangés
- Naviguer vers `/buyer/invoices` → **INV-DEMO-RFQYLANGEXTR, 2 400,00 EUR, ISSUED**
- Ouvrir le PDF de la facture

#### D. Parcours Seller — Dashboard & Conformité (3 min)
- Login `smoke-seller@iox.mch` → `/seller/compliance`
- Montrer les **3 documents de conformité** :
  - ✅ Certificat phytosanitaire — VERIFIED
  - ⏳ Certification bio AB — PENDING
  - ❌ Licence export — REJECTED (dossier incomplet)
- Naviguer vers `/seller/invoices` → facture 2 400,00 EUR (vue vendeur)
- Naviguer vers `/seller/quote-requests` → vue scopée (2 RFQs)

#### E. Paiement Stripe Connect (1 min)
> "Stripe Connect découpe automatiquement le paiement. IOX retient 5% = 120 EUR.  
> Le vendeur reçoit 2 280 EUR directement. Sans virement manuel."

#### F. KPIs / Traction (1 min)
- 9 sellers APPROVED, 13 produits PUBLISHED
- 1 003 tests automatisés backend, 0 failure
- TypeScript strict — 0 erreurs

#### G. Si audience technique — API Swagger (2 min)
- Ouvrir `http://localhost:3001/api/docs`
- Montrer les tags : payments, invoices, marketplace - quote requests, compliance
- "186 endpoints documentés. JWT Bearer. Webhook Stripe signé HMAC."

---

## PHRASES CLÉS à mémoriser

| Moment | Phrase |
|---|---|
| Ouverture | "Mayotte est le 1er producteur mondial d'ylang-ylang. IOX, c'est leur vitrine digitale." |
| Catalogue | "Chaque fiche produit, c'est une coopérative réelle avec certifications, capacité, incoterms." |
| RFQ WON | "De la demande à la facture : tout tracé, tout numérique, tout automatique." |
| Stripe | "Le vendeur ne demande pas à être payé. Stripe Connect le fait automatiquement." |
| Conformité | "L'acheteur sait que le produit est conforme avant de commander. Pas d'improvisation." |
| Clôture | "Le produit est là, fonctionnel, testé. Il manque les premiers vrais clients." |

---

## OBJECTIONS PROBABLES

| Objection | Réponse préparée |
|---|---|
| "Les vendeurs ne sont pas prêts pour le numérique" | "Onboarding assisté prévu. L'interface est simple. Formation 2h maximum." |
| "Stripe ne fonctionne pas à Mayotte" | "Stripe Connect est disponible pour les DOM français depuis 2022. KYC vendeurs = 30 min." |
| "5% c'est trop cher" | "Exportateur traditionnel : 15-30%. IOX : 5%. Facture auto, conformité incluse." |
| "Vous n'avez pas de vrais clients" | "Exact. La démo est fictive. C'est pourquoi nous cherchons [partenaires pilotes / investisseur]." |
| "Quelqu'un d'autre peut copier ça" | "La barrière c'est la confiance locale + le réseau vendeurs + la conformité documentaire. Pas juste le code." |
| "C'est quoi votre MRR ?" | "Nous n'avons pas encore de revenus réels. Nous cherchons [montant] pour atteindre les premiers [N] clients." |

---

## APRÈS le rendez-vous

### Envoi immédiat (< 2h)
- [ ] Envoyer `exports/iox-fiche-synthese.pdf`
- [ ] Envoyer `exports/iox-deck-investisseur.pdf`
- [ ] Email de remerciement avec 1-2 points clés de l'échange

### Suivi
- [ ] Proposer un prochain RDV si intérêt (due diligence)
- [ ] Proposer accès démo auto-hébergée (si infrastructure dispo)
- [ ] Préparer les réponses aux questions restées ouvertes

### Documents de suivi disponibles
- `notes/faq-investisseurs-iox.md` — 30 Q&R pour le due diligence
- `notes/business-model-iox.md` — détail business model
- `notes/roadmap-produit-iox.md` — roadmap technique détaillée
- `notes/demo-runbook-technique.md` — guide démarrage technique

---

## ORDRE DES DOCUMENTS PAR ÉTAPE

| Étape | Document à envoyer |
|---|---|
| Premier contact | `fiche-synthese-iox.pdf` (1 page) |
| Appel découverte | Pitch 2 min oral + `fiche-synthese-iox.pdf` |
| RDV démo | `deck-investisseur-iox.pdf` + démo live |
| Due diligence | `faq-investisseurs-iox.md` + `business-model-iox.md` + `roadmap-produit-iox.md` |
| Closing | [Term sheet, CGU, documents légaux — à préparer] |

---

*Pour le runbook technique complet : `notes/demo-runbook-technique.md`*  
*Pour le script de démo 20 min : `notes/demo-script-investisseur-client.md`*
