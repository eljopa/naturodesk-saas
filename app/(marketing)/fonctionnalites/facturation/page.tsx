import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Facturation pour naturopathes | NaturoDesk",
  description:
    "Émettez des factures numérotées automatiquement, enregistrez les paiements et téléchargez des PDF professionnels — sans logiciel de comptabilité séparé.",
  alternates: {
    canonical: "/fonctionnalites/facturation",
  },
  openGraph: {
    title: "Facturation pour naturopathes | NaturoDesk",
    description:
      "Émettez des factures numérotées automatiquement, enregistrez les paiements et téléchargez des PDF professionnels — sans logiciel de comptabilité séparé.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function BillIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round"/></svg>;
}
function UsersIcon()    { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function CalIcon()      { return <svg viewBox="0 0 24 24" style={ic}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function LeafIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round"/></svg>; }
function HashIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" strokeLinecap="round"/></svg>; }
function CreditIcon()   { return <svg viewBox="0 0 24 24" style={ic}><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22" strokeLinecap="round"/></svg>; }
function MailIcon()     { return <svg viewBox="0 0 24 24" style={ic}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7" strokeLinecap="round"/></svg>; }
function ListIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function FacturationPage() {
  return (
    <FeaturePageTemplate
      featureName="Facturation"
      category="Gestion du cabinet"
      heroIcon={<BillIcon size={28} />}
      title="Vos factures en deux clics, vos paiements tracés"
      subtitle="Créez des factures numérotées automatiquement, enregistrez les paiements (espèces, carte, virement, chèque) et téléchargez le PDF — depuis la fiche patient ou directement après la consultation."
      ctaPrimary={{ label: "Gérer ma facturation", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      presentationTitle="La facturation intégrée à votre flux de consultation"
      presentationText="La facturation NaturoDesk n'est pas un module isolé : elle est accessible depuis la fiche patient, depuis la consultation ou directement depuis la liste des factures. La numérotation est séquentielle et automatique. Les exports comptables sont prévus dans la roadmap."
      presentationStats={[
        { value: "Auto", label: "Numérotation séquentielle" },
        { value: "4", label: "Modes de paiement" },
        { value: "PDF", label: "Export instantané" },
        { value: "Email", label: "Envoi au patient" },
      ]}
      features={[
        {
          icon: <HashIcon />,
          title: "Numérotation automatique",
          description:
            "Chaque facture reçoit un numéro séquentiel unique généré automatiquement. Aucun risque de doublon ou de trou dans la numérotation.",
        },
        {
          icon: <ListIcon />,
          title: "Lignes de facturation libres",
          description:
            "Ajoutez autant de lignes que nécessaire : consultation, complément alimentaire, bilan, frais de déplacement. Quantité et prix unitaire sont personnalisables.",
        },
        {
          icon: <CreditIcon />,
          title: "4 modes de paiement",
          description:
            "Espèces, carte bancaire, virement, chèque. Le mode de paiement est enregistré avec la date d'encaissement.",
        },
        {
          icon: <DownloadIcon />,
          title: "PDF professionnel",
          description:
            "Téléchargement immédiat en PDF avec en-tête complet, informations praticien, détail des lignes, montant TTC et mention légale.",
        },
        {
          icon: <MailIcon />,
          title: "Envoi par email",
          description:
            "Envoyez la facture directement au patient par email en un clic. L'adresse email du dossier patient est préremplie automatiquement.",
        },
        {
          icon: <BillIcon />,
          title: "Statuts de facturation",
          description:
            "DRAFT → ÉMISE → PAYÉE → ANNULÉE. Suivez l'état de chaque facture. Les factures annulées restent dans l'historique et ne sont pas supprimées.",
        },
      ]}
      steps={[
        {
          title: "Créez la facture",
          description:
            "Depuis la fiche patient ou depuis la liste de facturation, créez une nouvelle facture. Le numéro est attribué automatiquement.",
        },
        {
          title: "Ajoutez les lignes",
          description:
            "Saisissez les prestations réalisées (libellé, quantité, prix unitaire). Le total TTC est calculé en temps réel.",
        },
        {
          title: "Émettez la facture",
          description:
            "Passez la facture au statut Émise. Elle est horodatée et ne peut plus être modifiée (annulation uniquement).",
        },
        {
          title: "Enregistrez le paiement",
          description:
            "Notez le mode de paiement et la date d'encaissement. La facture passe automatiquement au statut Payée.",
        },
        {
          title: "Téléchargez ou envoyez le PDF",
          description:
            "Téléchargez le PDF pour votre comptabilité ou envoyez-le directement au patient par email.",
        },
      ]}
      faqs={[
        {
          question: "La TVA est-elle gérée ?",
          answer:
            "Les naturopathes indépendants sont en général exonérés de TVA. La facturation NaturoDesk est prévue pour ce cas. La gestion de la TVA (paramétrable) est prévue dans la roadmap pour les cas particuliers.",
        },
        {
          question: "Peut-on modifier une facture après émission ?",
          answer:
            "Non — une facture émise ne peut pas être modifiée. C'est une contrainte légale. Pour rectifier une erreur, annulez la facture et créez-en une nouvelle. L'historique des annulations est conservé.",
        },
        {
          question: "Y a-t-il un export comptable (CSV, XML) ?",
          answer:
            "L'export CSV des factures est prévu dans la roadmap. En attendant, la liste des factures avec filtres (date, statut, patient) permet un suivi manuel.",
        },
        {
          question: "Peut-on facturer à une mutuelle ou à un tiers payant ?",
          answer:
            "La facturation tiers (mutuelle, employeur) est prévue dans la roadmap. Actuellement, la facturation est dirigée vers le patient uniquement.",
        },
      ]}
      relatedFeatures={[
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
        { label: "Agenda & rendez-vous", href: "/fonctionnalites/agenda-rendez-vous", icon: <CalIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
      ]}
    />
  );
}
