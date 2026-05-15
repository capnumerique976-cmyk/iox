/**
 * IOX — Actions quotidiennes par rôle (M103)
 *
 * Fonctions pures : prennent des données déjà chargées côté dashboard,
 * retournent une liste triée d'actions. Pas de DOM, pas d'appels API.
 * Testables unitairement.
 *
 * Intégration :
 *   - seller  → src/app/(dashboard)/seller/dashboard/page.tsx
 *   - buyer   → src/app/(dashboard)/buyer/page.tsx
 *   - admin   → src/app/(dashboard)/admin/page.tsx
 *
 * Composant UI : src/components/dashboard/daily-actions-panel.tsx
 */

import {
  AlertTriangle,
  Package,
  MessageSquareQuote,
  FileText,
  ShieldCheck,
  Search,
  Tag,
  Store,
  ClipboardList,
  Clock,
  MessageCircle,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types publics                                                       */
/* ------------------------------------------------------------------ */

export type ActionPriority = 'urgent' | 'action' | 'info';

export interface DailyAction {
  id: string;
  /** Label court affiché en titre de l'action. */
  title: string;
  /** Phrase courte expliquant pourquoi cette action est utile. */
  description: string;
  /** Destination CTA. */
  href: string;
  /** Priorité visuelle : urgent (rouge) > action (bleu) > info (gris). */
  priority: ActionPriority;
  /** Icône Lucide à afficher. */
  icon: LucideIcon;
  /** Badge court (ex : "2 nouvelles", "Urgent"). Optionnel. */
  badge?: string;
}

/* ------------------------------------------------------------------ */
/*  Types de données d'entrée                                          */
/* ------------------------------------------------------------------ */

/** Données seller extraites des API déjà chargées sur /seller/dashboard. */
export interface SellerDailyData {
  /** Documents avec verificationStatus REJECTED. */
  rejectedDocs: number;
  /** Documents avec verificationStatus PENDING. */
  pendingDocs: number;
  /** RFQ avec status NEW (demandes sans réponse). */
  newRfq: number;
  /** RFQ avec status NEGOTIATING. */
  negotiatingRfq: number;
  /** Profil complété à 0–100. */
  profileCompletionPct: number;
  /** true si au moins 1 produit existe. */
  hasProducts: boolean;
  /** true si au moins 1 offre existe. */
  hasOffers: boolean;
  /** true si au moins 1 document existe. */
  hasDocuments: boolean;
  /** Produits avec publicationStatus REJECTED. */
  rejectedProducts: number;
  /** Offres avec publicationStatus REJECTED. */
  rejectedOffers: number;
  /**
   * Messages non lus sur les RFQ (depuis /api/v1/dashboard/marketplace-alerts).
   * Optionnel : absent si l'endpoint n'a pas encore répondu.
   */
  newMessages?: number;
}

/** Données buyer extraites des API déjà chargées sur /buyer. */
export interface BuyerDailyData {
  /** RFQ avec status QUOTED — devis reçu, attend décision buyer. */
  quotedRfq: number;
  /** RFQ actives (NEW + QUALIFIED + NEGOTIATING). */
  activeRfq: number;
  /** Total toutes RFQ. */
  totalRfq: number;
  /**
   * Commandes gagnées avec paiement en attente
   * (depuis /api/v1/dashboard/marketplace-alerts → pendingPayment).
   * Optionnel : absent si l'endpoint n'a pas encore répondu.
   */
  pendingPayment?: number;
  /**
   * Messages non lus sur les RFQ (depuis /api/v1/dashboard/marketplace-alerts).
   * Optionnel : absent si l'endpoint n'a pas encore répondu.
   */
  newMessages?: number;
}

/** Données admin extraites des API déjà chargées sur /admin. */
export interface AdminDailyData {
  /** Éléments PENDING dans la file de revue (total). */
  pendingReviews: number;
  /** Revues PENDING bloquées depuis > 7 jours. */
  agedReviews: number;
  /** Profils vendeurs avec status PENDING_REVIEW. */
  pendingSellerProfiles: number;
  /** Documents expirant sous 30 jours. */
  expiringDocs30: number;
}

/* ------------------------------------------------------------------ */
/*  getSellerDailyActions                                               */
/* ------------------------------------------------------------------ */

/**
 * Retourne les actions quotidiennes pour un seller.
 * Tri par priorité décroissante : urgent > action > info.
 * La première action est la plus importante.
 */
export function getSellerDailyActions(data: SellerDailyData): DailyAction[] {
  const actions: DailyAction[] = [];

  // 1. Documents refusés — conformité compromise
  if (data.rejectedDocs > 0) {
    const n = data.rejectedDocs;
    actions.push({
      id: 'rejected-docs',
      title: `${n} document${n > 1 ? 's' : ''} refusé${n > 1 ? 's' : ''}`,
      description: 'Corrigez vos documents pour maintenir votre conformité.',
      href: '/seller/documents',
      priority: 'urgent',
      icon: FileText,
      badge: 'Urgent',
    });
  }

  // 2. Nouvelles demandes RFQ sans réponse
  if (data.newRfq > 0) {
    const n = data.newRfq;
    actions.push({
      id: 'new-rfq',
      title: `Répondre à ${n} demande${n > 1 ? 's' : ''}`,
      description: `Des acheteurs attendent votre réponse.`,
      href: '/seller/quote-requests',
      priority: 'urgent',
      icon: MessageSquareQuote,
      badge: n > 1 ? `${n} nouvelles` : 'Nouvelle',
    });
  }

  // 3. Profil incomplet (< 50%)
  if (data.profileCompletionPct < 50) {
    actions.push({
      id: 'complete-profile',
      title: 'Compléter mon profil vendeur',
      description: `Profil complété à ${data.profileCompletionPct}%. Un profil complet attire plus d'acheteurs.`,
      href: '/seller/profile/edit',
      priority: 'action',
      icon: Store,
    });
  }

  // 4. Aucun produit
  if (!data.hasProducts) {
    actions.push({
      id: 'add-product',
      title: 'Ajouter mon premier produit',
      description: 'Créez votre catalogue pour apparaître dans les résultats de recherche.',
      href: '/seller/marketplace-products/new',
      priority: 'action',
      icon: Package,
    });
  }

  // 5. Aucun document
  if (!data.hasDocuments) {
    actions.push({
      id: 'add-documents',
      title: 'Ajouter mes documents',
      description: 'Déposez certifications et pièces justificatives pour valider votre compte.',
      href: '/seller/documents',
      priority: 'action',
      icon: FileText,
    });
  }

  // 6. Aucune offre (mais au moins 1 produit)
  if (!data.hasOffers && data.hasProducts) {
    actions.push({
      id: 'create-offer',
      title: 'Créer une offre commerciale',
      description: 'Publiez une offre pour que les acheteurs puissent demander un devis.',
      href: '/seller/marketplace-offers/new',
      priority: 'info',
      icon: Tag,
    });
  }

  // 7. Contenus rejetés (produits + offres) — secondary
  const rejectedContent = data.rejectedProducts + data.rejectedOffers;
  if (rejectedContent > 0) {
    actions.push({
      id: 'rejected-content',
      title: `${rejectedContent} contenu${rejectedContent > 1 ? 's' : ''} à corriger`,
      description: 'Des produits ou offres ont été refusés. Apportez les corrections demandées.',
      href: '/seller/marketplace-products',
      priority: 'action',
      icon: AlertTriangle,
    });
  }

  // 8. Messages non lus — urgent si présents
  if (data.newMessages && data.newMessages > 0) {
    const n = data.newMessages;
    actions.push({
      id: 'new-messages-seller',
      title: `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`,
      description: 'Des acheteurs vous ont envoyé des messages sur vos demandes de devis.',
      href: '/seller/quote-requests',
      priority: 'urgent',
      icon: MessageCircle,
      badge: n > 1 ? `${n} nouveaux` : 'Nouveau',
    });
  }

  // 9. Demandes en négociation — info seulement
  if (data.negotiatingRfq > 0 && data.newRfq === 0) {
    const n = data.negotiatingRfq;
    actions.push({
      id: 'negotiating-rfq',
      title: `${n} demande${n > 1 ? 's' : ''} en négociation`,
      description: 'Continuez la discussion avec vos acheteurs.',
      href: '/seller/quote-requests',
      priority: 'info',
      icon: MessageSquareQuote,
    });
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  getBuyerDailyActions                                                */
/* ------------------------------------------------------------------ */

/**
 * Retourne les actions quotidiennes pour un buyer.
 */
export function getBuyerDailyActions(data: BuyerDailyData): DailyAction[] {
  const actions: DailyAction[] = [];

  // 1. Paiement en attente — bloquant sur le cycle d'achat
  if (data.pendingPayment && data.pendingPayment > 0) {
    const n = data.pendingPayment;
    actions.push({
      id: 'pending-payment',
      title: `${n} commande${n > 1 ? 's' : ''} à payer`,
      description: 'Finalisez le paiement pour confirmer vos commandes.',
      href: '/buyer/payments',
      priority: 'urgent',
      icon: CreditCard,
      badge: n > 1 ? `${n} en attente` : 'À payer',
    });
  }

  // 2. Devis reçus — action immédiate requise
  if (data.quotedRfq > 0) {
    const n = data.quotedRfq;
    actions.push({
      id: 'quoted-rfq',
      title: `${n} réponse${n > 1 ? 's' : ''} de vendeur à consulter`,
      description: `Vous avez ${n > 1 ? 'des devis en attente' : 'un devis en attente'} de votre décision.`,
      href: '/buyer/quote-requests',
      priority: 'urgent',
      icon: MessageSquareQuote,
      badge: n > 1 ? `${n} reçus` : 'Nouveau',
    });
  }

  // 3. Messages non lus sur les RFQ
  if (data.newMessages && data.newMessages > 0) {
    const n = data.newMessages;
    actions.push({
      id: 'new-messages-buyer',
      title: `${n} message${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`,
      description: 'Des vendeurs ont répondu à vos messages sur les demandes de devis.',
      href: '/buyer/quote-requests',
      priority: 'urgent',
      icon: MessageCircle,
      badge: n > 1 ? `${n} nouveaux` : 'Nouveau',
    });
  }

  // 4. Demandes actives en cours
  if (data.activeRfq > 0 && data.quotedRfq === 0) {
    const n = data.activeRfq;
    actions.push({
      id: 'active-rfq',
      title: `${n} demande${n > 1 ? 's' : ''} en cours`,
      description: 'Vos demandes sont transmises. Les vendeurs répondent sous peu.',
      href: '/buyer/quote-requests',
      priority: 'info',
      icon: Clock,
    });
  }

  // 5. Aucune demande — inciter à chercher
  if (data.totalRfq === 0) {
    actions.push({
      id: 'search-products',
      title: 'Rechercher un produit',
      description: 'Parcourez le catalogue et contactez les vendeurs pour recevoir des devis.',
      href: '/marketplace-hub',
      priority: 'action',
      icon: Search,
    });
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  getAdminDailyActions                                                */
/* ------------------------------------------------------------------ */

/**
 * Retourne les actions quotidiennes pour un admin.
 */
export function getAdminDailyActions(data: AdminDailyData): DailyAction[] {
  const actions: DailyAction[] = [];

  // 1. Revues bloquées > 7 jours — risque compliance
  if (data.agedReviews > 0) {
    const n = data.agedReviews;
    actions.push({
      id: 'aged-reviews',
      title: `${n} revue${n > 1 ? 's' : ''} bloquée${n > 1 ? 's' : ''} depuis + de 7 jours`,
      description: 'Des soumissions sont en attente depuis trop longtemps.',
      href: '/admin/review-queue?status=PENDING',
      priority: 'urgent',
      icon: AlertTriangle,
      badge: 'Bloqué',
    });
  }

  // 2. File de revue non vide
  if (data.pendingReviews > 0) {
    const n = data.pendingReviews;
    actions.push({
      id: 'pending-reviews',
      title: `Valider ${n} élément${n > 1 ? 's' : ''}`,
      description: 'Des publications, médias ou documents attendent votre validation.',
      href: '/admin/review-queue',
      priority: 'action',
      icon: ClipboardList,
      badge: n > 1 ? `${n} en attente` : 'En attente',
    });
  }

  // 3. Vendeurs en attente de validation
  if (data.pendingSellerProfiles > 0) {
    const n = data.pendingSellerProfiles;
    actions.push({
      id: 'pending-sellers',
      title: `${n} vendeur${n > 1 ? 's' : ''} en attente`,
      description: 'Des profils vendeurs sont soumis à validation.',
      href: '/admin/sellers?status=PENDING_REVIEW',
      priority: 'action',
      icon: Store,
    });
  }

  // 4. Documents expirant sous 30 jours
  if (data.expiringDocs30 > 0) {
    const n = data.expiringDocs30;
    actions.push({
      id: 'expiring-docs',
      title: `${n} document${n > 1 ? 's' : ''} à risque`,
      description: 'Des documents expirent dans moins de 30 jours.',
      href: '/admin/diagnostics',
      priority: 'info',
      icon: ShieldCheck,
    });
  }

  return actions;
}
