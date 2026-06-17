import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Protocoles & fiches conseil naturopathiques | NaturoDesk",
  description:
    "Rédigez, versionnez et remettez vos protocoles naturopathiques sous forme de fiches conseil PDF structurées — avec brouillon assisté depuis la consultation.",
  alternates: {
    canonical: "/fonctionnalites/protocoles",
  },
  openGraph: {
    title: "Protocoles & fiches conseil naturopathiques | NaturoDesk",
    description:
      "Rédigez, versionnez et remettez vos protocoles naturopathiques sous forme de fiches conseil PDF structurées — avec brouillon assisté depuis la consultation.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function LeafIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>;
}
function PulseIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function DownloadIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round"/></svg>; }
function GitBranchIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" strokeLinecap="round"/></svg>; }
function StarIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" strokeLinecap="round"/></svg>; }
function CopyIcon()   { return <svg viewBox="0 0 24 24" style={ic}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ProtocolesPage() {
  return (
    <FeaturePageTemplate
      featureName="Protocoles & fiches conseil"
      category="Suivi clinique"
      heroIcon={<LeafIcon size={28} />}
      title="Des protocoles structurés, versionnés et remis en PDF"
      subtitle="Rédigez vos fiches conseil en 13 sections thématiques, générez un brouillon depuis les données du bilan, versionnez chaque ajustement et téléchargez un PDF professionnel en un clic."
      ctaPrimary={{ label: "Créer ma première fiche", href: "/register" }}
      ctaSecondary={{ label: "En savoir plus", href: "/fonctionnalites" }}
      presentationTitle="L'équivalent numérique d'une ordonnance naturopathique"
      presentationText="La fiche conseil est le document de sortie de chaque consultation. Elle formalise le protocole naturopathique sous une forme structurée, imprimable et archivée dans le dossier du patient. Le versionnement intégré permet de suivre l'évolution des prescriptions sur la durée du suivi."
      presentationStats={[
        { value: "13", label: "Sections thématiques" },
        { value: "V1.0 →", label: "Versionnement intégré" },
        { value: "PDF", label: "Export instantané" },
        { value: "100%", label: "Sections optionnelles" },
      ]}
      features={[
        {
          icon: <StarIcon />,
          title: "13 sections thématiques",
          description:
            "Conseils alimentaires, compléments, phytothérapie, aromathérapie, micronutrition, gemmothérapie, fleurs de Bach, hygiène de vie, activité physique… Seules les sections remplies apparaissent dans le PDF.",
        },
        {
          icon: <StarIcon />,
          title: "Brouillon assisté",
          description:
            "Depuis une consultation analysée, générez un premier jet des sections en un clic à partir des données cliniques saisies (symptômes, constats, compléments).",
        },
        {
          icon: <GitBranchIcon />,
          title: "Versionnement majeur / mineur",
          description:
            "Chaque ajustement de protocole crée une nouvelle version (V1.0 → V1.1 → V2.0). L'historique complet est conservé et accessible à tout moment.",
        },
        {
          icon: <DownloadIcon />,
          title: "Export PDF professionnel",
          description:
            "Téléchargement immédiat en PDF avec en-tête patient, version et date. Remis en main propre ou envoyé par email.",
        },
        {
          icon: <CopyIcon />,
          title: "Duplication",
          description:
            "Dupliquez une fiche existante comme base d'un nouveau protocole pour un autre patient ou une nouvelle phase de suivi.",
        },
        {
          icon: <LeafIcon />,
          title: "Liaison consultation",
          description:
            "Chaque fiche peut être liée à la consultation dont elle est issue. Retrouvez en un clic les données cliniques ayant conduit au protocole.",
        },
      ]}
      steps={[
        {
          title: "Créez la fiche depuis la consultation",
          description:
            "En fin de bilan, cliquez sur 'Créer une fiche conseil'. Le lien avec la consultation est automatiquement établi.",
        },
        {
          title: "Générez un brouillon assisté (optionnel)",
          description:
            "Si la consultation a été analysée, générez un premier jet. Révisez et complétez les sections selon votre jugement clinique.",
        },
        {
          title: "Rédigez les 13 sections",
          description:
            "Saisissez uniquement les sections pertinentes. Les sections vides n'apparaissent pas dans le PDF final.",
        },
        {
          title: "Finalisez et téléchargez",
          description:
            "Passez la fiche en statut Final (horodatée automatiquement). Téléchargez le PDF et remettez-le au patient.",
        },
        {
          title: "Versionnez à la prochaine séance",
          description:
            "Créez une version mineure (V1.1) pour les ajustements ou une version majeure (V2.0) pour un changement de terrain.",
        },
      ]}
      faqs={[
        {
          question: "Peut-on créer une fiche indépendamment d'une consultation ?",
          answer:
            "Oui. La fiche conseil peut être créée librement pour n'importe quel patient, sans l'attacher à une consultation. La liaison est optionnelle.",
        },
        {
          question: "Combien de versions peut-on créer par patient ?",
          answer:
            "Il n'y a pas de limite. Chaque famille de versions est groupée dans la liste et affiche la version la plus récente en tête.",
        },
        {
          question: "Le brouillon assisté est-il modifiable ?",
          answer:
            "Oui. Le brouillon généré est entièrement éditable. C'est un point de départ — le praticien garde la main sur chaque section.",
        },
        {
          question: "La bibliothèque de modèles est-elle disponible ?",
          answer:
            "Les modèles de protocoles par catégorie (digestion, hormonal, stress, détox…) sont prévus dans la roadmap. Le modèle de données est déjà en place.",
        },
      ]}
      relatedFeatures={[
        { label: "Assistance clinique", href: "/fonctionnalites/assistance-clinique", icon: <ShieldIcon /> },
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <PulseIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
      ]}
    />
  );
}
