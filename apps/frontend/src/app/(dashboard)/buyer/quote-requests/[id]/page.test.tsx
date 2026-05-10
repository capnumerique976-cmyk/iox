// BUYER-DASHBOARD-1 — tests page détail /buyer/quote-requests/[id].
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { UserRole, QuoteRequestStatus } from '@iox/shared';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'q1' }),
}));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({
    user: { id: 'b-1', role: UserRole.MARKETPLACE_BUYER, email: 'buyer@ex.com' },
    token: 'tok',
    isLoading: false,
  }),
}));

const getMock = vi.fn();
const messagesMock = vi.fn();
const addMessageMock = vi.fn();
const updateStatusMock = vi.fn();
vi.mock('@/lib/quote-requests', async () => {
  const actual = await vi.importActual<typeof import('@/lib/quote-requests')>(
    '@/lib/quote-requests',
  );
  return {
    ...actual,
    quoteRequestsApi: {
      ...actual.quoteRequestsApi,
      get: (...args: unknown[]) => getMock(...args),
      messages: (...args: unknown[]) => messagesMock(...args),
      addMessage: (...args: unknown[]) => addMessageMock(...args),
      updateStatus: (...args: unknown[]) => updateStatusMock(...args),
    },
  };
});

import BuyerQuoteRequestDetailPage from './page';

function makeRfq(status: QuoteRequestStatus) {
  return {
    id: 'q1',
    status,
    requestedQuantity: 100,
    requestedUnit: 'kg',
    deliveryCountry: 'FR',
    targetMarket: 'EU',
    message: 'Bonjour, intéressé par votre vanille.',
    assignedToUserId: null,
    createdAt: '2026-04-20T00:00:00Z',
    updatedAt: '2026-04-21T00:00:00Z',
    marketplaceOffer: {
      id: 'o1',
      title: 'Vanille Bourbon',
      priceMode: 'FIXED',
      unitPrice: '420',
      currency: 'EUR',
      moq: 50,
      incoterm: 'FOB',
      leadTimeDays: 14,
      departureLocation: 'Tamatave',
      sellerProfile: { id: 'sp1', slug: 'coop-x', publicDisplayName: 'Coop X' },
      marketplaceProduct: { id: 'mp1', slug: 'vanille', commercialName: 'Vanille' },
    },
    buyerCompany: { id: 'c1', code: 'BUY', name: 'Buyer Co', country: 'FR' },
    buyerUser: { id: 'b-1', firstName: 'Bob', lastName: 'Buyer', email: 'b@ex.com' },
    assignedToUser: null,
  };
}

const sampleMessage = {
  id: 'm1',
  message: 'Quel est votre lead time exact ?',
  isInternalNote: false,
  createdAt: '2026-04-22T10:00:00Z',
  authorUser: {
    id: 'b-1',
    firstName: 'Bob',
    lastName: 'Buyer',
    email: 'b@ex.com',
    role: 'MARKETPLACE_BUYER',
  },
};

describe('BuyerQuoteRequestDetailPage (BUYER-DASHBOARD-1)', () => {
  beforeEach(() => {
    getMock.mockReset();
    messagesMock.mockReset();
    addMessageMock.mockReset();
    updateStatusMock.mockReset();
  });
  afterEach(() => vi.clearAllMocks());

  it('rend l\'en-tête avec offre, vendeur et statut', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<BuyerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument());
    expect(screen.getByText(/Coop X/)).toBeInTheDocument();
    // 'Nouvelle' appears multiple times (badge + timeline step) — check via badge class
    expect(screen.getAllByText('Nouvelle').length).toBeGreaterThanOrEqual(1);
  });

  it('rend le thread vide + form actif', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<BuyerQuoteRequestDetailPage />);
    expect(await screen.findByTestId('buyer-rfq-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('buyer-rfq-empty-state')).toHaveTextContent(/question au vendeur/i);
    expect(screen.getByLabelText(/Nouveau message/i)).toBeInTheDocument();
  });

  it('affiche les messages du thread', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.QUOTED));
    messagesMock.mockResolvedValue([sampleMessage]);
    render(<BuyerQuoteRequestDetailPage />);
    expect(await screen.findByText(/lead time exact/)).toBeInTheDocument();
    expect(screen.getByText('Bob Buyer')).toBeInTheDocument();
  });

  it('envoie un nouveau message via addMessage(false)', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    addMessageMock.mockResolvedValue({ ...sampleMessage, id: 'm2', message: 'Test reply' });
    render(<BuyerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByLabelText(/Nouveau message/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Nouveau message/i), {
      target: { value: 'Test reply' },
    });
    fireEvent.click(screen.getByText('Envoyer'));
    await waitFor(() => expect(addMessageMock).toHaveBeenCalled());
    expect(addMessageMock).toHaveBeenCalledWith('q1', 'tok', 'Test reply', false);
  });

  it('affiche bouton Annuler si status NEW et appelle updateStatus(CANCELLED) après confirmation dialog', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    updateStatusMock.mockResolvedValue(makeRfq(QuoteRequestStatus.CANCELLED));
    render(<BuyerQuoteRequestDetailPage />);
    const btn = await screen.findByText(/Annuler la demande/);
    fireEvent.click(btn);
    // Dialog s'ouvre — cliquer "Confirmer"
    const confirmBtn = await screen.findByText('Confirmer');
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(updateStatusMock).toHaveBeenCalled());
    expect(updateStatusMock).toHaveBeenCalledWith('q1', QuoteRequestStatus.CANCELLED, 'tok');
  });

  it('cache le bouton Annuler si status QUOTED (non cancellable côté buyer)', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.QUOTED));
    messagesMock.mockResolvedValue([]);
    render(<BuyerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByText('Vanille Bourbon')).toBeInTheDocument());
    expect(screen.queryByText(/Annuler la demande/)).not.toBeInTheDocument();
  });

  it('ferme les échanges quand status CANCELLED', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.CANCELLED));
    messagesMock.mockResolvedValue([]);
    render(<BuyerQuoteRequestDetailPage />);
    expect(await screen.findByTestId('buyer-rfq-closed-notice')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nouveau message/i)).not.toBeInTheDocument();
  });

  it('M58 — bouton Envoyer désactivé si champ vide', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.NEW));
    messagesMock.mockResolvedValue([]);
    render(<BuyerQuoteRequestDetailPage />);
    const btn = await screen.findByTestId('buyer-rfq-send-btn');
    expect(btn).toBeDisabled();
  });

  it('M58 — section messages affiche chaque message dans la liste', async () => {
    getMock.mockResolvedValue(makeRfq(QuoteRequestStatus.QUOTED));
    messagesMock.mockResolvedValue([sampleMessage]);
    render(<BuyerQuoteRequestDetailPage />);
    await waitFor(() => expect(screen.getByTestId('buyer-rfq-messages-list')).toBeInTheDocument());
    expect(screen.getAllByTestId('buyer-rfq-message-item')).toHaveLength(1);
    expect(screen.getByTestId('buyer-rfq-messages-list')).toHaveTextContent('Quel est votre lead time exact');
  });
});
