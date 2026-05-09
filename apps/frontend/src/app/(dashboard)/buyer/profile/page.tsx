'use client';

// BUYER-DASHBOARD-2 — Page profil buyer.
// BUYER-DASHBOARD-3 — Bouton "Modifier" → /buyer/profile/edit?id=…

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Mail, MapPin, Phone, Globe, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/auth.context';
import { companiesApi, CompanySummary } from '@/lib/companies';
import { PageHeader } from '@/components/ui/page-header';

export default function BuyerProfilePage() {
  const { user, token } = useAuth();
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    companiesApi
      .findMine(token)
      .then(setCompanies)
      .catch((e: Error) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Building2 className="h-5 w-5" aria-hidden />}
        title="Mon profil"
        subtitle={user?.email ?? ''}
      />

      {/* Identité user */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Compte utilisateur</h2>
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Nom</dt>
            <dd className="text-gray-900">
              {user?.firstName} {user?.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="text-gray-900">{user?.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Profil</dt>
            <dd className="text-gray-900">Acheteur</dd>
          </div>
        </dl>
      </section>

      {err && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* Companies */}
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          {companies.length > 1 ? 'Mes entreprises' : 'Mon entreprise'}
        </h2>
        {loading ? (
          <div className="text-sm text-gray-500">Chargement…</div>
        ) : companies.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-600">
            <p>Aucune entreprise rattachée à votre compte.</p>
            <p className="mt-2 text-xs text-gray-500">
              Contactez l&apos;administrateur IOX pour finaliser votre rattachement.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {companies.map((c) => (
              <li
                key={c.id}
                data-testid={`buyer-company-${c.id}`}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{c.name}</h3>
                    <p className="text-xs font-mono text-gray-500">{c.code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Link
                      href={`/buyer/profile/edit?id=${c.id}`}
                      data-testid={`edit-company-${c.id}`}
                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Modifier
                    </Link>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  {c.email && (
                    <Field icon={<Mail className="h-3 w-3" />} label="Email" value={c.email} />
                  )}
                  {c.phone && (
                    <Field icon={<Phone className="h-3 w-3" />} label="Téléphone" value={c.phone} />
                  )}
                  {(c.address || c.city || c.country) && (
                    <Field
                      icon={<MapPin className="h-3 w-3" />}
                      label="Adresse"
                      value={[c.address, c.city, c.country].filter(Boolean).join(', ')}
                    />
                  )}
                  {c.website && (
                    <Field icon={<Globe className="h-3 w-3" />} label="Site web" value={c.website} />
                  )}
                  {c.vatNumber && (
                    <Field
                      icon={<span className="font-bold">N°</span>}
                      label="N° TVA"
                      value={c.vatNumber}
                    />
                  )}
                </dl>
                {c.description && (
                  <div className="mt-3">
                    <h4 className="text-[10px] uppercase tracking-wide text-gray-500">Pr&eacute;sentation</h4>
                    <p className="mt-1 whitespace-pre-line text-xs text-gray-800">{c.description}</p>
                  </div>
                )}
                {c.types.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {c.types.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Modifiez les coordonnées et l&apos;adresse. Les types et statut active
          sont gérés par l&apos;administrateur.
        </p>
      </section>
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-4 w-4 items-center justify-center text-gray-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
        <dd className="truncate text-gray-800">{value}</dd>
      </div>
    </div>
  );
}
