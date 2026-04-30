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
          Merci ! Votre paiement a été initié avec succès. Le vendeur sera notifié
          dans quelques instants.
        </p>
        <p className="mt-1 text-xs text-emerald-600">Réf. RFQ : {params.paymentId}</p>
      </div>
      <Link href="/buyer" className="inline-block text-sm text-blue-600 hover:underline">
        ← Retour à mon espace acheteur
      </Link>
    </div>
  );
}
