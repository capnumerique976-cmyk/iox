'use client';

// PAY-1 phase 1 LOT 3 — Page buyer cancel après abandon Stripe Checkout.

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function BuyerCheckoutCancelPage() {
  const params = useParams<{ paymentId: string }>();
  return (
    <div className="space-y-6 p-6" data-testid="buyer-payments-cancel-page">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-yellow-800">
          <AlertCircle className="h-6 w-6" />
          Paiement annulé
        </h1>
        <p className="mt-2 text-sm text-yellow-700">
          Le paiement a ete annule. Votre commande reste en attente — vous pouvez repayer
          a tout moment.
        </p>
        <p className="mt-1 text-xs text-yellow-600">N° demande : {params.paymentId}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/buyer/payments/checkout/${params.paymentId}`}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Reessayer le paiement
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
