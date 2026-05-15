import { describe, it, expect } from 'vitest';
import {
  getSellerDailyActions,
  getBuyerDailyActions,
  getAdminDailyActions,
  type SellerDailyData,
  type BuyerDailyData,
  type AdminDailyData,
} from './daily-actions';

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

const sellerBase: SellerDailyData = {
  rejectedDocs: 0,
  pendingDocs: 0,
  newRfq: 0,
  negotiatingRfq: 0,
  profileCompletionPct: 100,
  hasProducts: true,
  hasOffers: true,
  hasDocuments: true,
  rejectedProducts: 0,
  rejectedOffers: 0,
};

const buyerBase: BuyerDailyData = {
  quotedRfq: 0,
  activeRfq: 0,
  totalRfq: 5,
};

const adminBase: AdminDailyData = {
  pendingReviews: 0,
  agedReviews: 0,
  pendingSellerProfiles: 0,
  expiringDocs30: 0,
};

/* ------------------------------------------------------------------ */
/*  getSellerDailyActions                                               */
/* ------------------------------------------------------------------ */

describe('getSellerDailyActions', () => {
  it('état vide — retourne 0 action si tout est OK', () => {
    const actions = getSellerDailyActions(sellerBase);
    expect(actions).toHaveLength(0);
  });

  it('document refusé → 1ère action urgente', () => {
    const actions = getSellerDailyActions({ ...sellerBase, rejectedDocs: 2 });
    expect(actions[0].id).toBe('rejected-docs');
    expect(actions[0].priority).toBe('urgent');
    expect(actions[0].badge).toBe('Urgent');
    expect(actions[0].title).toContain('2');
  });

  it('1 nouveau RFQ → action urgente', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newRfq: 1 });
    expect(actions[0].id).toBe('new-rfq');
    expect(actions[0].priority).toBe('urgent');
  });

  it('document refusé + RFQ → les deux apparaissent, doc refusé en premier', () => {
    const actions = getSellerDailyActions({ ...sellerBase, rejectedDocs: 1, newRfq: 3 });
    expect(actions[0].id).toBe('rejected-docs');
    expect(actions[1].id).toBe('new-rfq');
  });

  it('profil incomplet < 50% → action "complete-profile"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, profileCompletionPct: 33 });
    expect(actions.some((a) => a.id === 'complete-profile')).toBe(true);
    expect(actions.find((a) => a.id === 'complete-profile')?.priority).toBe('action');
  });

  it('profil à 50% → pas de "complete-profile"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, profileCompletionPct: 50 });
    expect(actions.some((a) => a.id === 'complete-profile')).toBe(false);
  });

  it('pas de produit → action "add-product"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, hasProducts: false });
    expect(actions.some((a) => a.id === 'add-product')).toBe(true);
    expect(actions.find((a) => a.id === 'add-product')?.priority).toBe('action');
  });

  it('pas de document → action "add-documents"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, hasDocuments: false });
    expect(actions.some((a) => a.id === 'add-documents')).toBe(true);
  });

  it('pas d\'offre mais produits → action "create-offer"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, hasOffers: false, hasProducts: true });
    expect(actions.some((a) => a.id === 'create-offer')).toBe(true);
    expect(actions.find((a) => a.id === 'create-offer')?.priority).toBe('info');
  });

  it('pas d\'offre et pas de produit → pas de "create-offer" (prérequis produit)', () => {
    const actions = getSellerDailyActions({ ...sellerBase, hasOffers: false, hasProducts: false });
    expect(actions.some((a) => a.id === 'create-offer')).toBe(false);
  });

  it('contenus rejetés (produits + offres) → action "rejected-content"', () => {
    const actions = getSellerDailyActions({
      ...sellerBase,
      rejectedProducts: 1,
      rejectedOffers: 2,
    });
    const a = actions.find((a) => a.id === 'rejected-content');
    expect(a).toBeDefined();
    expect(a?.title).toContain('3'); // 1+2
  });

  it('href de rejected-docs pointe vers /seller/documents', () => {
    const actions = getSellerDailyActions({ ...sellerBase, rejectedDocs: 1 });
    expect(actions[0].href).toBe('/seller/documents');
  });

  it('href de new-rfq pointe vers /seller/quote-requests', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newRfq: 1 });
    expect(actions[0].href).toBe('/seller/quote-requests');
  });

  it('badge singulier pour 1 RFQ', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newRfq: 1 });
    expect(actions[0].badge).toBe('Nouvelle');
  });

  it('badge pluriel pour 3 RFQ', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newRfq: 3 });
    expect(actions[0].badge).toBe('3 nouvelles');
  });

  it('trie : urgent avant action avant info', () => {
    const actions = getSellerDailyActions({
      ...sellerBase,
      profileCompletionPct: 20,    // action
      hasOffers: false,            // info
      rejectedDocs: 1,             // urgent
    });
    const priorities = actions.map((a) => a.priority);
    const firstUrgent = priorities.indexOf('urgent');
    const firstAction = priorities.indexOf('action');
    const firstInfo = priorities.indexOf('info');
    expect(firstUrgent).toBeLessThan(firstAction);
    if (firstInfo !== -1) expect(firstAction).toBeLessThan(firstInfo);
  });

  it('tous les ids sont uniques', () => {
    const actions = getSellerDailyActions({
      rejectedDocs: 1,
      pendingDocs: 2,
      newRfq: 2,
      negotiatingRfq: 1,
      profileCompletionPct: 10,
      hasProducts: false,
      hasOffers: false,
      hasDocuments: false,
      rejectedProducts: 1,
      rejectedOffers: 1,
    });
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // M104 — newMessages
  it('newMessages > 0 → action urgente "new-messages-seller"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newMessages: 3 });
    const a = actions.find((x) => x.id === 'new-messages-seller');
    expect(a).toBeDefined();
    expect(a?.priority).toBe('urgent');
    expect(a?.title).toContain('3');
    expect(a?.badge).toBe('3 nouveaux');
    expect(a?.href).toBe('/seller/quote-requests');
  });

  it('newMessages = 1 → badge singulier "Nouveau"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newMessages: 1 });
    const a = actions.find((x) => x.id === 'new-messages-seller');
    expect(a?.badge).toBe('Nouveau');
    expect(a?.title).toContain('1');
  });

  it('newMessages absent → pas de "new-messages-seller"', () => {
    const actions = getSellerDailyActions(sellerBase);
    expect(actions.some((x) => x.id === 'new-messages-seller')).toBe(false);
  });

  it('newMessages = 0 → pas de "new-messages-seller"', () => {
    const actions = getSellerDailyActions({ ...sellerBase, newMessages: 0 });
    expect(actions.some((x) => x.id === 'new-messages-seller')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  getBuyerDailyActions                                                */
/* ------------------------------------------------------------------ */

describe('getBuyerDailyActions', () => {
  it('totalRfq > 0, aucune quoted, aucune active → 0 action urgente', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 0, activeRfq: 0, totalRfq: 1 });
    expect(actions.every((a) => a.priority !== 'urgent')).toBe(true);
  });

  it('quotedRfq > 0 → action urgente "quoted-rfq"', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, quotedRfq: 2, activeRfq: 0 });
    expect(actions[0].id).toBe('quoted-rfq');
    expect(actions[0].priority).toBe('urgent');
    expect(actions[0].title).toContain('2');
  });

  it('badge singulier pour 1 devis reçu', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, quotedRfq: 1, activeRfq: 0 });
    expect(actions[0].badge).toBe('Nouveau');
  });

  it('badge pluriel pour 3 devis reçus', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, quotedRfq: 3, activeRfq: 0 });
    expect(actions[0].badge).toBe('3 reçus');
  });

  it('totalRfq === 0 → action "search-products"', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 0, activeRfq: 0, totalRfq: 0 });
    expect(actions[0].id).toBe('search-products');
    expect(actions[0].href).toBe('/marketplace-hub');
    expect(actions[0].priority).toBe('action');
  });

  it('totalRfq > 0 → pas de "search-products"', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 0, activeRfq: 2, totalRfq: 5 });
    expect(actions.some((a) => a.id === 'search-products')).toBe(false);
  });

  it('activeRfq > 0 && quotedRfq === 0 → action info "active-rfq"', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 0, activeRfq: 3, totalRfq: 5 });
    expect(actions.some((a) => a.id === 'active-rfq')).toBe(true);
    expect(actions.find((a) => a.id === 'active-rfq')?.priority).toBe('info');
  });

  it('quotedRfq > 0 → pas de "active-rfq" (quotedRfq prend la priorité)', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 1, activeRfq: 2, totalRfq: 5 });
    expect(actions.some((a) => a.id === 'active-rfq')).toBe(false);
    expect(actions[0].id).toBe('quoted-rfq');
  });

  it('href "quoted-rfq" pointe vers /buyer/quote-requests', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, quotedRfq: 1, activeRfq: 0 });
    expect(actions[0].href).toBe('/buyer/quote-requests');
  });

  it('tous les ids uniques', () => {
    const actions = getBuyerDailyActions({ quotedRfq: 1, activeRfq: 2, totalRfq: 0 });
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // M104 — pendingPayment
  it('pendingPayment > 0 → action urgente "pending-payment"', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, pendingPayment: 2 });
    const a = actions.find((x) => x.id === 'pending-payment');
    expect(a).toBeDefined();
    expect(a?.priority).toBe('urgent');
    expect(a?.title).toContain('2');
    expect(a?.href).toBe('/buyer/payments');
    expect(a?.badge).toBe('2 en attente');
  });

  it('pendingPayment = 1 → badge "À payer"', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, pendingPayment: 1 });
    const a = actions.find((x) => x.id === 'pending-payment');
    expect(a?.badge).toBe('À payer');
  });

  it('pendingPayment absent → pas de "pending-payment"', () => {
    const actions = getBuyerDailyActions(buyerBase);
    expect(actions.some((x) => x.id === 'pending-payment')).toBe(false);
  });

  it('pendingPayment = 0 → pas de "pending-payment"', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, pendingPayment: 0 });
    expect(actions.some((x) => x.id === 'pending-payment')).toBe(false);
  });

  it('pendingPayment prioritaire sur quotedRfq', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, pendingPayment: 1, quotedRfq: 2 });
    expect(actions[0].id).toBe('pending-payment');
    expect(actions[1].id).toBe('quoted-rfq');
  });

  // M104 — newMessages buyer
  it('newMessages > 0 → action urgente "new-messages-buyer"', () => {
    const actions = getBuyerDailyActions({ ...buyerBase, newMessages: 2 });
    const a = actions.find((x) => x.id === 'new-messages-buyer');
    expect(a).toBeDefined();
    expect(a?.priority).toBe('urgent');
    expect(a?.title).toContain('2');
    expect(a?.href).toBe('/buyer/quote-requests');
  });

  it('newMessages absent → pas de "new-messages-buyer"', () => {
    const actions = getBuyerDailyActions(buyerBase);
    expect(actions.some((x) => x.id === 'new-messages-buyer')).toBe(false);
  });

  it('tous les ids uniques avec pendingPayment + newMessages', () => {
    const actions = getBuyerDailyActions({
      quotedRfq: 1,
      activeRfq: 2,
      totalRfq: 5,
      pendingPayment: 1,
      newMessages: 3,
    });
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ------------------------------------------------------------------ */
/*  getAdminDailyActions                                                */
/* ------------------------------------------------------------------ */

describe('getAdminDailyActions', () => {
  it('état vide — retourne 0 action', () => {
    const actions = getAdminDailyActions(adminBase);
    expect(actions).toHaveLength(0);
  });

  it('agedReviews > 0 → action urgente "aged-reviews"', () => {
    const actions = getAdminDailyActions({ ...adminBase, agedReviews: 3 });
    expect(actions[0].id).toBe('aged-reviews');
    expect(actions[0].priority).toBe('urgent');
    expect(actions[0].badge).toBe('Bloqué');
    expect(actions[0].title).toContain('3');
  });

  it('pendingReviews > 0 → action "pending-reviews"', () => {
    const actions = getAdminDailyActions({ ...adminBase, pendingReviews: 5 });
    expect(actions.some((a) => a.id === 'pending-reviews')).toBe(true);
    expect(actions.find((a) => a.id === 'pending-reviews')?.priority).toBe('action');
  });

  it('pendingSellerProfiles > 0 → action "pending-sellers"', () => {
    const actions = getAdminDailyActions({ ...adminBase, pendingSellerProfiles: 2 });
    expect(actions.some((a) => a.id === 'pending-sellers')).toBe(true);
    expect(actions.find((a) => a.id === 'pending-sellers')?.href).toBe(
      '/admin/sellers?status=PENDING_REVIEW',
    );
  });

  it('expiringDocs30 > 0 → action info "expiring-docs"', () => {
    const actions = getAdminDailyActions({ ...adminBase, expiringDocs30: 4 });
    expect(actions.some((a) => a.id === 'expiring-docs')).toBe(true);
    expect(actions.find((a) => a.id === 'expiring-docs')?.priority).toBe('info');
  });

  it('aged + pending + sellers → aged d\'abord', () => {
    const actions = getAdminDailyActions({
      pendingReviews: 10,
      agedReviews: 2,
      pendingSellerProfiles: 3,
      expiringDocs30: 1,
    });
    expect(actions[0].id).toBe('aged-reviews');
  });

  it('href aged-reviews contient ?status=PENDING', () => {
    const actions = getAdminDailyActions({ ...adminBase, agedReviews: 1 });
    expect(actions[0].href).toContain('status=PENDING');
  });

  it('tous les ids uniques', () => {
    const actions = getAdminDailyActions({
      pendingReviews: 5,
      agedReviews: 2,
      pendingSellerProfiles: 3,
      expiringDocs30: 4,
    });
    const ids = actions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
