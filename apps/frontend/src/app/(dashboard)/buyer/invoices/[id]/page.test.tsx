/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getMock = vi.fn();
const downloadPdfMock = vi.fn();

vi.mock('@/lib/invoices', () => ({
  invoicesApi: {
    get: (...args: unknown[]) => getMock(...args),
    downloadPdf: (...args: unknown[]) => downloadPdfMock(...args),
  },
}));

vi.mock('@/contexts/auth.context', () => ({
  useAuth: () => ({ token: 'jwt-test' }),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'inv-1' }),
}));

import BuyerInvoiceDetailPage from './page';

function makeInvoice() {
  return {
    id: 'inv-1',
    paymentId: 'pay-1',
    sellerProfileId: 'sp-1',
    buyerCompanyId: 'co-1',
    invoiceNumber: 'IOX-2026-000123',
    amountCents: 150000,
    currency: 'EUR',
    status: 'ISSUED' as const,
    pdfStorageKey: null,
    issuedAt: '2026-05-20T12:00:00Z',
    createdAt: '2026-05-19T12:00:00Z',
    updatedAt: '2026-05-20T12:00:00Z',
  };
}

describe('BuyerInvoiceDetailPage — download PDF', () => {
  beforeEach(() => {
    getMock.mockReset();
    downloadPdfMock.mockReset();
  });

  it('clic download → fetch blob authentifié + download programmatique', async () => {
    getMock.mockResolvedValue(makeInvoice());
    const fakeBlob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
    downloadPdfMock.mockResolvedValue(fakeBlob);

    // JSDOM ne fournit pas URL.createObjectURL — on stub directement.
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:fake');
    const revokeObjectURLSpy = vi.fn();
    (URL as unknown as { createObjectURL: typeof createObjectURLSpy }).createObjectURL = createObjectURLSpy;
    (URL as unknown as { revokeObjectURL: typeof revokeObjectURLSpy }).revokeObjectURL = revokeObjectURLSpy;

    const user = userEvent.setup();
    render(<BuyerInvoiceDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('buyer-invoice-download-pdf')).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('buyer-invoice-download-pdf'));

    await waitFor(() => {
      expect(downloadPdfMock).toHaveBeenCalledWith('inv-1', 'jwt-test');
      expect(createObjectURLSpy).toHaveBeenCalledWith(fakeBlob);
    });
    // revoke est planifié via setTimeout(…, 0) — laisse-le se résoudre.
    await new Promise((r) => setTimeout(r, 5));
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake');
  });

  it('download échoue → alerte d\'erreur visible', async () => {
    getMock.mockResolvedValue(makeInvoice());
    downloadPdfMock.mockRejectedValue(new Error('Téléchargement du PDF échoué (HTTP 500)'));

    const user = userEvent.setup();
    render(<BuyerInvoiceDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('buyer-invoice-download-pdf')).toBeInTheDocument(),
    );

    await user.click(screen.getByTestId('buyer-invoice-download-pdf'));

    await waitFor(() => {
      expect(screen.getByTestId('buyer-invoice-download-error')).toHaveTextContent(
        'Téléchargement du PDF échoué (HTTP 500)',
      );
    });
  });
});
