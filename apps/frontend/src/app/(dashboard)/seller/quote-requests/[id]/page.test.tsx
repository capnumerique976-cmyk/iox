// M58 — Tests page détail demande de devis côté vendeur.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QuoteRequestStatus } from '@iox/shared';

vi.mock('lucide-react', () => {
  const icon = (name: string) => {
    const Comp = ({ className }: { className?: string }) => <span data-testid={`icon-${name}`} className={className} />;
    Comp.displayName = name;
    return Comp;
  };
  return {
    CheckCircle2: icon('CheckCircle2'),
    Circle: icon('Circle'),
    XCircle: icon('XCircle'),
    Clock: icon('Clock'),
  };
});

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'rfq-s1' }),
}));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({ token: 'tok', user: { id: 'seller-1', role: 'MARKETPLACE_SELLER' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const getMock = vi.fn();
const messagesMock = vi.fn();
const addMessageMock = vi.fn();

vi.mock('@/lib/quote-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/quote-requests')>('@/lib/quote-requests');
  return {
    ...actual,
    quoteRequestsApi: {
      ...actual.quoteRequestsApi,
      get: (...args: unknown[]) => getMock(...args),
      messages: (...args: unknown[]) => messagesMock(...args),
      addMessage: (...args: unknown[]) => addMessageMock(...args),
    },
  };
});

import SellerQuoteRequestDetailPage from './page';

function makeRfq(status: QuoteRequestStatus) {
  return {
    id: 'rfq-s1',
    status,
    requestedQuantity: 50,
    requestedUnit: 'kg',
    deliveryCountry: 'DE',
    targetMarket: 'EU',
    message: 'Bonjour, intéressé par votre offre.',
    assignedToUserId: null,
    createdAt: '2026-04-18T00:00:00Z',
    updatedAt: '2026-04-20T00:00:00Z',
    marketplaceOffer: {
      id: 'o2',
      title: 'Cannelle de Madagascar Premium',
      priceMode: 'FIXED',
      unitPrice: '12.00',
      currency: 'EUR',
      moq: 20,
      incoterm: 'CIF',
      leadTimeDays: 30,
      departureLocation: 'Toamasina',
      sellerProfile: { id: 'sp1', slug: 'coop-y', publicDisplayName: 'Coop Y' },
      marketplaceProduct: { id: 'mp2', slug: 'cannelle', commercialName: 'Cannelle' },
    },
    buyerCompany: { id: 'c2', code: 'GER', name: 'Spices GmbH', country: 'DE' },
    buyerUser: { id: 'b-2', firstName: 'Hans', lastName: 'Kaufer', email: 'h@spices.de' },
    assignedToUser: null,
  };
}

const sampleMessage = {
  id: 'm-s1',
  message: 'Quelle est votre capacité de production mensuelle ?',
  isInternalNote: false,
  createdAt: '2026-04-19T09:00:00Z',
  authorUser: { id: 'b-2', firstName: 'Hans', lastName: 'Kaufer', email: 'h@spices.de', role: 'MARKETPLACE_BUYER' },
};

describe('SellerQuoteRequestDetailPage (M58)', () => {
  beforeEach(() => {
    getMock.mockReset();
    messagesMock.mockReset();
    addMessageMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('affiche le titre de l\'offre et le nom de l\'acheteur', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByText('Cannelle de Madagascar Premium')).toBeInTheDocument());
    // "Spices GmbH" apparaît dans le header ET dans le dl → getAllByText
    expect(screen.getAllByText(/Spices GmbH/).length).toBeGreaterThanOrEqual(1);
  });

  it('affiche empty state si aucun message', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    expect(await screen.findByTestId('seller-rfq-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('seller-rfq-empty-state')).toHaveTextContent(/précision/i);
  });

  it('affiche les messages de la conversation', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.QUOTED));
    messagesMock.mockResolvedValue([sampleMessage]);
    render(<SellerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-messages-list')).toBeInTheDocument());
    expect(screen.getByTestId('seller-rfq-messages-list')).toHaveTextContent('capacité de production');
    expect(screen.getAllByTestId('seller-rfq-message-item')).toHaveLength(1);
  });

  it('le vendeur peut envoyer un message (addMessage appelé avec isInternalNote=false)', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.QUOTED));
    messagesMock.mockResolvedValue([]);
    addMessageMock.mockResolvedValue({
      id: 'm-s2',
      message: 'Notre capacité est de 5 tonnes/mois.',
      isInternalNote: false,
      createdAt: '2026-04-20T10:00:00Z',
      authorUser: { id: 'seller-1', firstName: 'S', lastName: 'V', email: 'sv@coop.mg', role: 'MARKETPLACE_SELLER' },
    });
    render(<SellerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-message-input')).toBeInTheDocument());
    fireEvent.change(screen.getByTestId('seller-rfq-message-input'), {
      target: { value: 'Notre capacité est de 5 tonnes/mois.' },
    });
    fireEvent.click(screen.getByTestId('seller-rfq-send-btn'));
    await waitFor(() => expect(addMessageMock).toHaveBeenCalled());
    expect(addMessageMock).toHaveBeenCalledWith('rfq-s1', 'tok', 'Notre capacité est de 5 tonnes/mois.', false);
  });

  it('bouton Envoyer désactivé si champ vide', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    const btn = await screen.findByTestId('seller-rfq-send-btn');
    expect(btn).toBeDisabled();
  });

  it('affiche notice lecture seule si RFQ terminée (WON)', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.WON));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    expect(await screen.findByTestId('seller-rfq-closed-notice')).toBeInTheDocument();
    expect(screen.getByTestId('seller-rfq-closed-notice')).toHaveTextContent(/terminée/i);
    expect(screen.queryByTestId('seller-rfq-message-form')).not.toBeInTheDocument();
  });

  it('affiche notice lecture seule si RFQ CANCELLED', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.CANCELLED));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    expect(await screen.findByTestId('seller-rfq-closed-notice')).toBeInTheDocument();
  });

  it('affiche erreur si fetch RFQ échoue', async () => {
    getMock.mockRejectedValue(new Error('Demande introuvable'));
    messagesMock.mockResolvedValue([]);
    render(<SellerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByTestId('seller-rfq-detail-error')).toBeInTheDocument());
    expect(screen.getByTestId('seller-rfq-detail-error')).toHaveTextContent('Demande introuvable');
  });
});
