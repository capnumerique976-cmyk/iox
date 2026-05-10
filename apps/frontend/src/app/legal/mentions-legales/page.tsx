import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales de la plateforme IOX — Indian Ocean Xchange.',
};

/**
 * Page mentions légales — /legal/mentions-legales
 *
 * Document de travail. Champs [À compléter] à renseigner avec les
 * informations juridiques réelles (SIREN, adresse, hébergeur, etc.)
 * avant publication officielle.
 */
export default function MentionsLegalesPage() {
  return (
    <article className="prose-legal">
      <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
        <strong>⚠ Document de travail — Version pilote fermé</strong>
        <br />
        Les champs [À compléter] doivent être renseignés avec les informations officielles de la
        société éditrice avant toute publication publique.
      </div>

      <h1 className="mb-2 text-3xl font-bold text-white">Mentions légales</h1>
      <p className="mb-8 text-sm text-white/40">
        Conformément à la loi n° 2004-575 du 21 juin 2004 (LCEN)
      </p>

      <Section title="1. Éditeur du site">
        <InfoRow label="Raison sociale" value="[À compléter — NOM DE LA SOCIÉTÉ]" />
        <InfoRow label="Forme juridique" value="[À compléter — ex. : SAS, SARL, SASU]" />
        <InfoRow label="Capital social" value="[À compléter — ex. : 10 000 €]" />
        <InfoRow label="Siège social" value="[À compléter — ADRESSE COMPLÈTE]" />
        <InfoRow label="SIREN" value="[À compléter]" />
        <InfoRow label="SIRET" value="[À compléter]" />
        <InfoRow label="TVA intracommunautaire" value="[À compléter]" />
        <InfoRow label="RCS" value="[À compléter — Ville d'immatriculation]" />
        <InfoRow
          label="E-mail de contact"
          value={
            <a href="mailto:contact@iox.example" className="text-[#00D4FF] hover:underline">
              contact@iox.example
            </a>
          }
        />
        <InfoRow label="Téléphone" value="[À compléter]" />
      </Section>

      <Section title="2. Directeur de la publication">
        <InfoRow label="Nom et prénom" value="[À compléter]" />
        <InfoRow label="Qualité" value="[À compléter — ex. : Président, Directeur Général]" />
        <InfoRow label="E-mail" value="[À compléter]" />
      </Section>

      <Section title="3. Hébergeur du site">
        <p>Le site est hébergé par :</p>
        <InfoRow label="Raison sociale" value="[À compléter — ex. : Hetzner Online GmbH]" />
        <InfoRow label="Adresse" value="[À compléter]" />
        <InfoRow label="Pays des serveurs" value="[À compléter — Union Européenne]" />
        <InfoRow
          label="Site web"
          value={
            <a
              href="https://www.hetzner.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:underline"
            >
              [À compléter]
            </a>
          }
        />
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          L&apos;ensemble du contenu du site (textes, images, graphismes, logo, icônes, logiciels)
          est la propriété exclusive de [À compléter — NOM DE LA SOCIÉTÉ] ou de ses partenaires, et
          est protégé par les lois françaises et internationales relatives à la propriété
          intellectuelle.
        </p>
        <p>
          Toute reproduction totale ou partielle de ce contenu est strictement interdite sans
          autorisation expresse et préalable de l&apos;éditeur.
        </p>
      </Section>

      <Section title="5. Responsabilité">
        <p>
          IOX s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations
          diffusées sur le site. Cependant, IOX ne peut garantir l&apos;exactitude, la précision ou
          l&apos;exhaustivité des informations mises à disposition.
        </p>
        <p>
          IOX décline toute responsabilité pour toute imprécision, inexactitude ou omission portant
          sur des informations disponibles sur le site, ainsi que pour tout dommage résultant
          d&apos;une intrusion frauduleuse d&apos;un tiers.
        </p>
      </Section>

      <Section title="6. Données personnelles">
        <p>
          Pour toute information sur le traitement de vos données personnelles, consultez notre{' '}
          <a href="/legal/privacy" className="text-[#00D4FF] hover:underline">
            Politique de confidentialité
          </a>
          .
        </p>
        <p>
          Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d&apos;un droit
          d&apos;accès, de rectification, de suppression et de portabilité de vos données. Contact :{' '}
          <a href="mailto:rgpd@iox.example" className="text-[#00D4FF] hover:underline">
            rgpd@iox.example
          </a>
          .
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          Le site utilise uniquement des cookies strictement nécessaires à son fonctionnement
          (session, langue). Aucun cookie de tracking ou publicitaire n&apos;est utilisé.
        </p>
      </Section>

      <Section title="8. Droit applicable">
        <p>
          Les présentes mentions légales sont soumises au droit français. En cas de litige, les
          tribunaux français seront seuls compétents.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Pour toute question ou réclamation concernant le site :{' '}
          <a href="mailto:contact@iox.example" className="text-[#00D4FF] hover:underline">
            contact@iox.example
          </a>
        </p>
      </Section>

      <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/30">
        <p>
          <a href="/legal/terms" className="hover:text-white/60">
            CGU
          </a>{' '}
          ·{' '}
          <a href="/legal/privacy" className="hover:text-white/60">
            Politique de confidentialité
          </a>{' '}
          · IOX — Indian Ocean Xchange
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

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 border-b border-white/5 py-1.5 text-sm">
      <span className="w-48 flex-shrink-0 text-white/40">{label}</span>
      <span className="text-white/70">{value}</span>
    </div>
  );
}
