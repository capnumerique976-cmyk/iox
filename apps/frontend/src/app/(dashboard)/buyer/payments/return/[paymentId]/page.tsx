'use client';

// PAY-1 phase 1 LOT 3 — Page buyer return après Stripe Checkout success.

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function BuyerCheckoutReturnPage() {
  const params = useParams<{ paymentId: string }>();
  return (
    <div className="space-y-6 p-6" data-testid="buyer-payments-return-page">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-emerald-800">
          <CheckCircle2 className="h-6 w-6" />
          Paiement reçu
        </h1>
        <p className="mt-2 text-sm text-emerald-700">
          Merci ! Votre paiement a ete recu avec succes. Le vendeur sera notifie
          et votre facture sera disponible sous peu.
        </p>
        <p className="mt-1 text-xs text-emerald-600">N° demande : {params.paymentId}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/buyer/invoices"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Voir ma facture
        </Link>
        <Link
          href="/buyer"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Mon espace acheteur
        </Link>
      </div>
    </div>
  );
}
