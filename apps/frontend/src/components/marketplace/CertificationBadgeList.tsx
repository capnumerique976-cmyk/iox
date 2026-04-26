// FP-2 — Liste de badges certifications, lecture seule.
// Composant public utilisé sur la fiche produit et la page vendeur.
// Aucun état, aucun fetch — données projetées par le backend
// (filtrées VERIFIED + non expirées en amont).
//
// Hypothèses :
//   - `certifications` reçues normalisées (verified, non expirées, triées)
//   - chaque entrée porte son scope (SELLER_PROFILE | MARKETPLACE_PRODUCT)
//     pour permettre un éventuel groupage côté UI (non utilisé ici dans le
//     MVP : on affiche tout en bloc, le scope reste exploitable via
//     `data-scope`)
//   - si la liste est vide, le composant ne rend rien (no-op silencieux)

import type { Certification, CertificationType } from '@/lib/marketplace/types';

const LABELS_FR: Record<CertificationType, string> = {
  BIO_EU: 'Bio (UE)',
  BIO_USDA: 'Bio (USDA)',
  ECOCERT: 'Ecocert',
  FAIRTRADE: 'Fairtrade',
  RAINFOREST_ALLIANCE: 'Rainforest Alliance',
  HACCP: 'HACCP',
  ISO_22000: 'ISO 22000',
  ISO_9001: 'ISO 9001',
  GLOBALGAP: 'GLOBALG.A.P.',
  BRC: 'BRC',
  IFS: 'IFS',
  KOSHER: 'Kosher',
  HALAL: 'Halal',
  OTHER: 'Autre',
};

export interface CertificationBadgeListProps {
  certifications: Certification[];
  /** Optionnel : surcharge l'intitulé d'a11y (utile si plusieurs instances). */
  ariaLabel?: string;
  /** Titre visible (défaut "Certifications"). Passez `null` pour masquer. */
  title?: string | null;
}

function formatValidUntil(date: string | null): string | null {
  if (!date) return null;
  // Affichage volontairement court (yyyy-MM) pour ne pas alourdir le badge.
  // Tolère un ISO ou une date simple.
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${m}`;
}

export function CertificationBadgeList({
  certifications,
  ariaLabel,
  title = 'Certifications',
}: CertificationBadgeListProps) {
  if (!certifications || certifications.length === 0) return null;

  return (
    <div
      className="iox-glass relative overflow-hidden rounded-2xl p-5"
      data-testid="certification-badge-list"
      role="group"
      aria-label={ariaLabel ?? 'Certifications du vendeur ou du produit'}
    >
      <span
        aria-hidden
        className="absolute left-0 top-5 bottom-5 w-1 rounded-r-full bg-gradient-iox-neon"
      />
      <div className="pl-3">
        {title !== null && <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>}

        <ul className="flex flex-wrap gap-2" role="list">
          {certifications.map((c) => {
            const label = LABELS_FR[c.type] ?? c.type;
            const expiry = formatValidUntil(c.validUntil);
            const issuingHint = c.issuingBody ? ` — ${c.issuingBody}` : '';
            const codeHint = c.code ? ` (${c.code})` : '';
            const a11y = `${label}${issuingHint}${codeHint}${expiry ? `, valide jusqu'à ${expiry}` : ''}`;

            return (
              <li key={c.id} role="listitem">
                <span
                  data-testid={`certification-badge-${c.type}`}
                  data-scope={c.relatedType}
                  data-cert-id={c.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#00D4FF]/40 bg-[#00D4FF]/10 px-2.5 py-1 text-[11px] font-medium text-white shadow-glow-cyan-sm"
                  aria-label={a11y}
                  title={a11y}
                >
                  <span className="uppercase tracking-wide">{label}</span>
                  {expiry && (
                    <span aria-hidden className="text-white/55">
                      · {expiry}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
