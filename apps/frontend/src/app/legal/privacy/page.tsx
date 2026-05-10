import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Politique de confidentialité et protection des données personnelles — IOX.',
};

/**
 * Page politique de confidentialité — /legal/privacy
 *
 * Document de travail RGPD. Champs [À compléter] à renseigner avant
 * publication officielle. Faire valider par DPO ou juriste RGPD.
 */
export default function PrivacyPage() {
  return (
    <article className="prose-legal">
      <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
        <strong>⚠ Document de travail — Version pilote fermé</strong>
        <br />
        Ce document est provisoire. Certains champs sont à compléter et à valider par un
        professionnel du droit ou un DPO qualifié avant toute publication officielle.
      </div>

      <h1 className="mb-2 text-3xl font-bold text-white">
        Politique de confidentialité
      </h1>
      <p className="mb-8 text-sm text-white/40">
        Version pilote · IOX — Indian Ocean Xchange · Conformité RGPD
      </p>

      <Section title="1. Responsable de traitement">
        <p>
          Le responsable du traitement de vos données personnelles est la société éditrice de la
          plateforme IOX.
        </p>
        <InfoBox>
          Raison sociale : [À compléter]<br />
          Siège social : [À compléter]<br />
          E-mail RGPD : <a href="mailto:rgpd@iox.example" className="text-[#00D4FF] hover:underline">rgpd@iox.example</a><br />
          Référent RGPD / DPO : [À compléter]
        </InfoBox>
      </Section>

      <Section title="2. Données collectées">
        <SubSection title="Données d'identification et de contact">
          <ul>
            <li>Nom, prénom du contact principal</li>
            <li>Adresse e-mail professionnelle</li>
            <li>Numéro de téléphone professionnel</li>
            <li>Dénomination sociale et forme juridique</li>
            <li>Adresse du siège social</li>
            <li>Numéro SIREN/SIRET ou équivalent</li>
          </ul>
        </SubSection>
        <SubSection title="Données d'activité sur la plateforme">
          <ul>
            <li>Produits publiés, catalogues, prix</li>
            <li>Demandes de devis (RFQ) émises et reçues</li>
            <li>Messages échangés entre utilisateurs</li>
            <li>Documents uploadés (bons de commande, factures, certificats)</li>
            <li>Historique des transactions et paiements</li>
          </ul>
        </SubSection>
        <SubSection title="Données techniques">
          <ul>
            <li>Adresse IP de connexion</li>
            <li>Type de navigateur et appareil</li>
            <li>Logs d&apos;accès et d&apos;activité (audit logs)</li>
            <li>Cookies de session (authentification uniquement)</li>
          </ul>
        </SubSection>
        <SubSection title="Données de paiement (Stripe Connect)">
          <p>
            Les données bancaires et de paiement sont traitées directement par <strong>Stripe</strong>.
            IOX ne stocke pas de numéro de carte bancaire. Stripe dispose de sa propre politique de
            confidentialité :{' '}
            <a
              href="https://stripe.com/fr/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00D4FF] hover:underline"
            >
              stripe.com/fr/privacy
            </a>
            .
          </p>
        </SubSection>
      </Section>

      <Section title="3. Bases légales et finalités">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10 text-white/50">
              <th className="pb-2 pr-4 text-left font-medium">Finalité</th>
              <th className="pb-2 pr-4 text-left font-medium">Base légale</th>
            </tr>
          </thead>
          <tbody className="text-white/60">
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Gestion des comptes utilisateurs</td>
              <td className="py-2 pr-4">Exécution du contrat (CGU)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Traitement des transactions / RFQ</td>
              <td className="py-2 pr-4">Exécution du contrat</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Envoi d&apos;e-mails transactionnels</td>
              <td className="py-2 pr-4">Exécution du contrat / intérêt légitime</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Conservation des factures</td>
              <td className="py-2 pr-4">Obligation légale (comptable/fiscale)</td>
            </tr>
            <tr className="border-b border-white/5">
              <td className="py-2 pr-4">Audit logs / sécurité</td>
              <td className="py-2 pr-4">Intérêt légitime (sécurité)</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Statistiques d&apos;usage (pilote)</td>
              <td className="py-2 pr-4">Intérêt légitime (amélioration service)</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="4. Durées de conservation">
        <ul>
          <li>Données de compte actif : durée d&apos;activité du compte + 3 ans</li>
          <li>Factures et documents comptables : 10 ans (obligation légale)</li>
          <li>Audit logs : 12 mois glissants</li>
          <li>Logs techniques : 90 jours</li>
          <li>Données de paiement Stripe : selon politique Stripe</li>
          <li>E-mails : 12 mois après la dernière interaction</li>
        </ul>
        <p className="text-white/40 text-xs mt-2">
          [À affiner selon analyse d&apos;impact DPO]
        </p>
      </Section>

      <Section title="5. Partage des données">
        <p>IOX ne vend pas vos données personnelles. Les données peuvent être partagées avec :</p>
        <ul>
          <li>
            <strong>Stripe</strong> — prestataire de paiement (KYC, transactions)
          </li>
          <li>
            <strong>Prestataire e-mail transactionnel</strong> — envoi des notifications
            [À compléter : Postmark / Mailgun / SendGrid]
          </li>
          <li>
            <strong>Hébergeur VPS</strong> — [À compléter : OVH / Hetzner / Scaleway] — données
            stockées dans l&apos;Union Européenne
          </li>
          <li>
            <strong>Autorités compétentes</strong> — si obligation légale
          </li>
        </ul>
        <p>
          Tous les sous-traitants font l&apos;objet d&apos;un contrat de traitement conforme au RGPD
          (article 28).
        </p>
      </Section>

      <Section title="6. Vos droits">
        <p>
          Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
        </p>
        <ul>
          <li>
            <strong>Droit d&apos;accès</strong> — obtenir une copie de vos données
          </li>
          <li>
            <strong>Droit de rectification</strong> — corriger des données inexactes
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> — demander la suppression (sous réserve des
            obligations légales de conservation)
          </li>
          <li>
            <strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> — s&apos;opposer à certains traitements
          </li>
          <li>
            <strong>Droit à la limitation</strong> — limiter le traitement dans certains cas
          </li>
        </ul>
        <p>
          Pour exercer vos droits :{' '}
          <a href="mailto:rgpd@iox.example" className="text-[#00D4FF] hover:underline">
            rgpd@iox.example
          </a>
          . Réponse sous 30 jours.
        </p>
        <p>
          En cas de désaccord, vous pouvez saisir la{' '}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D4FF] hover:underline"
          >
            CNIL
          </a>
          .
        </p>
      </Section>

      <Section title="7. Cookies">
        <p>
          IOX utilise uniquement des cookies <strong>strictement nécessaires</strong> au
          fonctionnement de la plateforme (session authentifiée, préférences de langue). Aucun
          cookie de tracking ou publicitaire n&apos;est utilisé.
        </p>
        <p>
          Ces cookies ne requièrent pas de consentement en vertu de l&apos;article 82 de la loi
          Informatique et Libertés.
        </p>
      </Section>

      <Section title="8. Sécurité">
        <p>
          IOX met en œuvre des mesures techniques et organisationnelles pour protéger vos données :
          chiffrement HTTPS/TLS, hachage des mots de passe (bcrypt), contrôle d&apos;accès par rôle
          (RBAC), audit logs, sauvegardes chiffrées.
        </p>
      </Section>

      <Section title="9. Modification de la politique">
        <p>
          Cette politique peut être mise à jour. La date de dernière mise à jour sera indiquée en
          haut de la page. Les modifications importantes seront notifiées par e-mail.
        </p>
      </Section>

      <div className="mt-12 border-t border-white/10 pt-6 text-xs text-white/30">
        <p>
          Contact RGPD :{' '}
          <a href="mailto:rgpd@iox.example" className="hover:text-white/60">
            rgpd@iox.example
          </a>{' '}
          ·{' '}
          <a href="/legal/terms" className="hover:text-white/60">
            CGU
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

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/5 px-4 py-3 text-xs leading-relaxed text-white/60">
      {children}
    </div>
  );
}
