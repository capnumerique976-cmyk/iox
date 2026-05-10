import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation',
  description: 'CGU de la plateforme IOX — Indian Ocean Xchange.',
};

/**
 * Page CGU — /legal/terms
 *
 * Document de travail. Les champs [À compléter] doivent être renseignés
 * avec les informations réelles et validés par un professionnel du droit
 * avant toute publication officielle.
 */
export default function TermsPage() {
  return (
    <article className="prose-legal">
      {/* Bannière document de travail */}
      <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
        <strong>⚠ Document de travail — Version pilote fermé</strong>
        <br />
        Ce document est provisoire. Certains champs sont à compléter avec les informations
        juridiques définitives. Ne constitue pas un avis juridique officiel.
      </div>

      <h1 className="mb-2 text-3xl font-bold text-white">
        Conditions Générales d&apos;Utilisation
      </h1>
      <p className="mb-8 text-sm text-white/40">
        Version pilote · Entrée en vigueur : [À compléter] · IOX — Indian Ocean Xchange
      </p>

      <Section title="Article 1 — Objet de la plateforme">
        <p>
          IOX est une <strong>place de marché B2B en ligne</strong> dédiée aux exportations de
          produits agricoles en provenance de Mayotte et des régions productrices associées.
          La plateforme met en relation des <strong>vendeurs</strong> (coopératives agricoles et
          producteurs organisés) et des <strong>acheteurs</strong> (professionnels et entreprises
          importateurs).
        </p>
        <p>
          IOX propose notamment : publication et consultation de catalogues produits, émission et
          gestion de demandes de devis (RFQ), traitement sécurisé des paiements via Stripe Connect,
          gestion documentaire (bons de commande, factures, documents d&apos;exportation).
        </p>
        <p>
          L&apos;accès et l&apos;utilisation de la plateforme impliquent l&apos;acceptation sans
          réserve des présentes CGU.
        </p>
      </Section>

      <Section title="Article 2 — Inscription et comptes">
        <p>
          L&apos;accès est réservé aux <strong>personnes morales</strong> et professionnels agissant
          dans le cadre de leur activité. La plateforme n&apos;est pas destinée aux consommateurs.
        </p>
        <SubSection title="Compte Vendeur (Coopérative)">
          <p>
            Réservé aux coopératives agricoles et structures assimilées. L&apos;inscription est
            soumise à <strong>validation par l&apos;équipe IOX</strong> avant activation complète.
            Des documents peuvent être requis (statuts, extrait Kbis ou équivalent, capacité export).
          </p>
        </SubSection>
        <SubSection title="Compte Acheteur (B2B)">
          <p>
            Réservé aux entreprises et professionnels souhaitant sourcer des produits agricoles.
            L&apos;inscription peut être soumise à vérification.
          </p>
        </SubSection>
        <p>
          L&apos;utilisateur est seul responsable de la confidentialité de ses identifiants.
          En cas de compromission, contacter immédiatement :{' '}
          <a href="mailto:support@iox.example" className="text-[#00D4FF] hover:underline">
            support@iox.example
          </a>
          .
        </p>
      </Section>

      <Section title="Article 3 — Rôle de la plateforme">
        <p>
          <strong>
            IOX agit en qualité d&apos;intermédiaire technique et commercial. IOX n&apos;est pas
            partie aux contrats conclus entre Vendeurs et Acheteurs via la plateforme.
          </strong>
        </p>
        <p>
          Les transactions commerciales sont conclues directement entre le Vendeur et
          l&apos;Acheteur. IOX facilite la mise en relation et le traitement des paiements, mais ne
          garantit pas la qualité des produits, leur conformité réglementaire, ni la solvabilité des
          parties.
        </p>
      </Section>

      <Section title="Article 4 — Obligations des utilisateurs">
        <ul>
          <li>Fournir des informations exactes, complètes et à jour.</li>
          <li>
            Ne pas utiliser la plateforme à des fins illicites, frauduleuses ou contraires aux
            présentes CGU.
          </li>
          <li>Ne pas tenter d&apos;accéder à des zones réservées sans autorisation.</li>
          <li>
            Respecter la propriété intellectuelle d&apos;IOX et des autres utilisateurs.
          </li>
          <li>
            Ne pas publier de contenu inexact, trompeur ou portant atteinte aux droits de tiers.
          </li>
        </ul>
      </Section>

      <Section title="Article 5 — Paiements et Stripe Connect">
        <p>
          Les paiements sont traités par <strong>Stripe Connect</strong>, prestataire de services de
          paiement. IOX n&apos;accède pas directement aux données bancaires des utilisateurs.
        </p>
        <p>
          Les Vendeurs doivent compléter le processus KYC (Know Your Customer) de Stripe avant de
          recevoir des paiements. Des frais de transaction s&apos;appliquent selon les conditions
          Stripe en vigueur.
        </p>
        <p className="text-white/40 text-xs">
          [À compléter : taux de commission IOX, délais de versement, politique de remboursement]
        </p>
      </Section>

      <Section title="Article 6 — Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus de la plateforme (interface, logo, code, documentation) est
          la propriété exclusive d&apos;IOX ou de ses partenaires et est protégé par le droit de la
          propriété intellectuelle. Toute reproduction non autorisée est interdite.
        </p>
        <p>
          Les Vendeurs conservent la propriété intellectuelle sur leurs contenus (photos produits,
          descriptions). En les publiant, ils accordent à IOX une licence d&apos;utilisation pour
          les afficher sur la plateforme.
        </p>
      </Section>

      <Section title="Article 7 — Données personnelles">
        <p>
          IOX traite des données personnelles conformément au RGPD. Pour en savoir plus, consultez
          notre{' '}
          <a href="/legal/privacy" className="text-[#00D4FF] hover:underline">
            Politique de confidentialité
          </a>
          .
        </p>
      </Section>

      <Section title="Article 8 — Limitation de responsabilité">
        <p>
          IOX ne saurait être tenu responsable des dommages indirects, consécutifs ou imprévisibles
          résultant de l&apos;utilisation de la plateforme. La responsabilité directe d&apos;IOX est
          limitée au montant des commissions effectivement perçues au cours des 12 mois précédant le
          dommage.
        </p>
        <p className="text-white/40 text-xs">
          [À compléter et valider juridiquement selon le droit applicable]
        </p>
      </Section>

      <Section title="Article 9 — Suspension et résiliation">
        <p>
          IOX se réserve le droit de suspendre ou résilier tout compte en cas de violation des
          présentes CGU, de comportement frauduleux ou de mise en danger de la plateforme ou de ses
          utilisateurs.
        </p>
        <p>
          L&apos;utilisateur peut clôturer son compte à tout moment en contactant{' '}
          <a href="mailto:support@iox.example" className="text-[#00D4FF] hover:underline">
            support@iox.example
          </a>
          . La clôture n&apos;efface pas les transactions et documents légalement conservés.
        </p>
      </Section>

      <Section title="Article 10 — Droit applicable et juridiction">
        <p className="text-white/40 text-xs">
          [À compléter — droit français applicable, tribunal compétent, clause de médiation
          éventuelle]
        </p>
        <p>
          Tout litige relatif aux présentes CGU sera soumis au droit français. Les parties
          s&apos;engagent à rechercher une solution amiable avant tout recours judiciaire.
        </p>
      </Section>

      <Section title="Article 11 — Modification des CGU">
        <p>
          IOX se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
          seront informés par e-mail et/ou notification dans l&apos;application. La poursuite de
          l&apos;utilisation de la plateforme après modification vaut acceptation des nouvelles CGU.
        </p>
      </Section>

      <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/30">
        <p>
          Questions :{' '}
          <a href="mailto:support@iox.example" className="hover:text-white/60">
            support@iox.example
          </a>{' '}
          ·{' '}
          <a href="/legal/privacy" className="hover:text-white/60">
            Politique de confidentialité
          </a>{' '}
          ·{' '}
          <a href="/legal/mentions-legales" className="hover:text-white/60">
            Mentions légales
          </a>
        </p>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-white/90">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/60">{children}</div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
      <h3 className="mb-2 text-sm font-medium text-white/80">{title}</h3>
      <div className="text-sm text-white/60">{children}</div>
    </div>
  );
}
