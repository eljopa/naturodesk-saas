import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Protocoles et fiches conseil pour naturopathes | NaturoDesk",
  description:
    "Créez, personnalisez et versionnez vos protocoles naturopathiques. Remettez à vos patients des fiches conseil professionnelles, claires et faciles à suivre.",
  alternates: {
    canonical: "/fonctionnalites/protocoles",
  },
  openGraph: {
    title: "Protocoles et fiches conseil pour naturopathes | NaturoDesk",
    description:
      "Créez, personnalisez et versionnez vos protocoles naturopathiques. Remettez à vos patients des fiches conseil professionnelles, claires et faciles à suivre.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function ClipboardIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h4" strokeLinecap="round"/></svg>;
}
function TargetIcon()   { return <svg viewBox="0 0 24 24" style={ic}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1" fill="currentColor"/></svg>; }
function AppleIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3c-1.2 0-2.4.6-3 1.5C8.4 3.6 7.2 3 6 3c-2.2 0-4 1.8-4 4 0 4 6 10 10 14 4-4 10-10 10-14 0-2.2-1.8-4-4-4-1.2 0-2.4.6-3 1.5" strokeLinecap="round"/></svg>; }
function PillIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="M8.5 8.5 15.5 15.5" strokeLinecap="round"/></svg>; }
function LeafIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function MoonIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>; }
function ActivityIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function UsersIcon()    { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function ShieldIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ProtocolesPage() {
  return (
    <FeaturePageTemplate
      featureName="Protocoles & fiches conseil"
      category="Protocoles & fiches conseil"
      heroIcon={<ClipboardIcon size={28} />}
      title="Transformez vos recommandations en plans d'action clairs pour vos patients."
      subtitle="Créez des protocoles structurés, personnalisez vos recommandations et remettez des fiches conseil professionnelles à l'issue de chaque consultation."
      ctaPrimary={{ label: "Découvrir les protocoles", href: "/register" }}
      ctaSecondary={{ label: "Voir un exemple de fiche", href: "/tarifs" }}
      heroReassurance={[
        "Fiches professionnelles",
        "PDF générés en un clic",
        "Historique des versions",
      ]}
      presentationTitle="Vos recommandations méritent un support à leur hauteur"
      presentationText="Après une consultation, le patient repart souvent avec de nombreuses informations à retenir. Conseils alimentaires, compléments, hygiène de vie, activité physique ou gestion du stress : sans support structuré, une partie des recommandations risque d'être oubliée. NaturoDesk vous permet de formaliser vos accompagnements dans des fiches conseil claires, organisées et faciles à consulter. Vous choisissez librement les rubriques utiles — seules les informations renseignées apparaissent dans le document final remis au patient. Un protocole peut être ajusté, complété ou réorganisé au fil des rendez-vous : NaturoDesk conserve l'historique des différentes versions pour retrouver facilement les recommandations initiales, les ajustements réalisés et les évolutions du suivi."
      presentationStats={[
        { value: "6", label: "Sections thématiques" },
        { value: "PDF", label: "Export instantané" },
        { value: "100%", label: "Personnalisable" },
        { value: "∞", label: "Versions conservées" },
      ]}
      features={[
        {
          icon: <TargetIcon />,
          title: "Objectifs du protocole",
          description:
            "Définissez les objectifs prioritaires de l'accompagnement.",
        },
        {
          icon: <AppleIcon />,
          title: "Conseils alimentaires",
          description:
            "Structurez les recommandations nutritionnelles à mettre en place.",
        },
        {
          icon: <PillIcon />,
          title: "Compléments alimentaires",
          description:
            "Ajoutez les produits, dosages et durées d'utilisation.",
        },
        {
          icon: <LeafIcon />,
          title: "Phytothérapie et aromathérapie",
          description:
            "Regroupez vos recommandations naturelles dans une section dédiée.",
        },
        {
          icon: <MoonIcon />,
          title: "Hygiène de vie",
          description:
            "Intégrez sommeil, stress, récupération et habitudes quotidiennes.",
        },
        {
          icon: <ActivityIcon />,
          title: "Activité physique",
          description:
            "Ajoutez des recommandations adaptées au profil du patient.",
        },
      ]}
      steps={[
        {
          title: "Réalisez votre consultation",
          description:
            "Recueillez les informations nécessaires au bilan.",
        },
        {
          title: "Analysez les constats utiles",
          description:
            "Appuyez-vous sur les éléments documentaires disponibles.",
        },
        {
          title: "Rédigez votre fiche conseil",
          description:
            "Structurez vos recommandations selon les besoins du patient.",
        },
        {
          title: "Générez le document final",
          description:
            "Exportez votre fiche au format PDF en quelques secondes.",
        },
      ]}
      faqs={[
        {
          question: "Puis-je personnaliser chaque fiche conseil ?",
          answer:
            "Oui. Chaque protocole est entièrement modifiable.",
        },
        {
          question: "Les fiches sont-elles liées au patient ?",
          answer:
            "Oui. Chaque fiche est associée au dossier du patient concerné.",
        },
        {
          question: "Puis-je modifier un protocole après sa création ?",
          answer:
            "Oui. Vous pouvez créer de nouvelles versions et conserver l'historique.",
        },
        {
          question: "Puis-je générer un PDF ?",
          answer:
            "Oui. Les fiches conseil peuvent être exportées au format PDF.",
        },
        {
          question: "Les sections sont-elles obligatoires ?",
          answer:
            "Non. Vous utilisez uniquement les rubriques pertinentes pour votre accompagnement.",
        },
        {
          question: "Puis-je retrouver les anciennes recommandations ?",
          answer:
            "Oui. Les versions précédentes restent accessibles dans l'historique.",
        },
      ]}
      relatedFeatures={[
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
        { label: "Assistance clinique", href: "/fonctionnalites/assistance-clinique", icon: <ShieldIcon /> },
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <ActivityIcon /> },
      ]}
      ctaFinalTitle="Remettez des recommandations plus claires et plus professionnelles"
      ctaFinalText="Structurez vos accompagnements et facilitez le suivi de vos patients au quotidien."
      ctaFinalPrimary={{ label: "Découvrir les protocoles", href: "/register" }}
      ctaFinalSecondary={{ label: "Découvrir les dossiers patients", href: "/fonctionnalites/dossiers-patients" }}
    />
  );
}
