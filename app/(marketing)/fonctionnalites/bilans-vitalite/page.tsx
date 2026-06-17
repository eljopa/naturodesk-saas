import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Bilans de vitalité naturopathiques | NaturoDesk",
  description:
    "Réalisez des bilans de vitalité structurés système par système, déclenchez l'analyse documentaire et suivez l'évolution de vos patients au fil des consultations.",
  alternates: {
    canonical: "/fonctionnalites/bilans-vitalite",
  },
  openGraph: {
    title: "Bilans de vitalité naturopathiques | NaturoDesk",
    description:
      "Réalisez des bilans de vitalité structurés système par système, déclenchez l'analyse documentaire et suivez l'évolution de vos patients au fil des consultations.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function PulseIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>;
}
function ShieldIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
function LeafIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function LayersIcon() { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></svg>; }
function PillIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7" strokeLinecap="round"/></svg>; }
function ListIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" strokeLinecap="round"/></svg>; }
function BrainIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 5c-1.1 0-2 .9-2 2v1c0 .9.4 1.7 1 2.2V12h2v-1.8c.6-.5 1-1.3 1-2.2V7c0-1.1-.9-2-2-2Z" strokeLinecap="round"/><path d="M9 17v1a3 3 0 0 0 6 0v-1M6 8a3 3 0 0 0 0 6h2M16 8a3 3 0 0 1 0 6h-2" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BilansVitaliePage() {
  return (
    <FeaturePageTemplate
      featureName="Bilans de vitalité"
      category="Clinique"
      heroIcon={<PulseIcon size={28} />}
      title="Des bilans structurés, de la saisie à l'analyse documentaire"
      subtitle="Saisissez symptômes, médicaments et compléments dans une interface organisée par onglets. Déclenchez l'analyse pour identifier les signaux cliniques connus — en un clic."
      ctaPrimary={{ label: "Commencer un bilan", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      presentationTitle="La structuration des données cliniques au service de l'analyse"
      presentationText="Un bilan de vitalité NaturoDesk capture les données cliniques dans un format structuré : les symptômes libres sont saisis par système organique, les médicaments et compléments sont normalisés, les constats sont catégorisés. Ce modèle de données alimente directement le moteur d'assistance clinique."
      presentationStats={[
        { value: "6", label: "Onglets de saisie" },
        { value: "5", label: "Statuts de workflow" },
        { value: "0–10", label: "Score charge médicamenteuse" },
        { value: "PDF", label: "Export consultation" },
      ]}
      features={[
        {
          icon: <LayersIcon />,
          title: "6 onglets de saisie",
          description:
            "Contexte général, symptômes par système organique, médicaments, compléments alimentaires, constats cliniques, base de connaissances.",
        },
        {
          icon: <PillIcon />,
          title: "Médicaments et compléments",
          description:
            "Saisissez les traitements en cours. Les médicaments sont résolus dans la BDPM, les compléments dans le catalogue NIH ODS.",
        },
        {
          icon: <BrainIcon />,
          title: "Analyse documentaire intégrée",
          description:
            "Déclenchez l'analyse depuis le bilan : le moteur croise les données avec les sources officielles et retourne les constats classés par catégorie.",
        },
        {
          icon: <ListIcon />,
          title: "Constats annotables",
          description:
            "Chaque constat peut être validé, annoté ou ignoré par le praticien. Les constats validés alimentent la fiche conseil.",
        },
        {
          icon: <ShieldIcon />,
          title: "Score de charge médicamenteuse",
          description:
            "Évaluation automatique de la complexité du traitement médicamenteux (0–10) avec seuil d'alerte colorimétrique.",
        },
        {
          icon: <PulseIcon />,
          title: "Statuts de workflow",
          description:
            "DRAFT → READY → ANALYSIS_PENDING → ANALYSIS_DONE. Le praticien maîtrise à chaque étape l'avancement du bilan.",
        },
      ]}
      steps={[
        {
          title: "Ouvrez ou créez le bilan",
          description:
            "Depuis la fiche patient, créez un nouveau bilan (type BILAN pour une première consultation, SUIVI pour les séances suivantes).",
        },
        {
          title: "Saisissez les données cliniques",
          description:
            "Renseignez le contexte, les symptômes par système, les médicaments et compléments en cours. Les champs libres sont structurés automatiquement.",
        },
        {
          title: "Validez le bilan",
          description:
            "Passez le bilan en statut READY quand toutes les données sont saisies. C'est le prérequis avant l'analyse.",
        },
        {
          title: "Déclenchez l'analyse",
          description:
            "Lancez l'analyse documentaire. Le moteur croise les données avec les sources officielles et calcule les constats en quelques secondes.",
        },
        {
          title: "Revue et création du protocole",
          description:
            "Consultez les constats. Validez ceux qui sont pertinents et créez la fiche conseil depuis ce même écran.",
        },
      ]}
      faqs={[
        {
          question: "Peut-on modifier un bilan après l'avoir analysé ?",
          answer:
            "Oui. Le bilan peut repasser en statut DRAFT pour être modifié, puis être soumis à une nouvelle analyse. L'historique des analyses précédentes est conservé.",
        },
        {
          question: "Combien de bilans peut-on créer par patient ?",
          answer:
            "Il n'y a pas de limite. Chaque consultation crée un bilan distinct. L'historique complet est accessible depuis la fiche patient.",
        },
        {
          question: "L'analyse fonctionne-t-elle sans médicaments déclarés ?",
          answer:
            "Oui. L'analyse peut fonctionner uniquement sur les compléments alimentaires, les symptômes ou la base documentaire. Les médicaments augmentent la profondeur des signaux identifiés.",
        },
        {
          question: "Les bilans précédents sont-ils comparables ?",
          answer:
            "La comparaison inter-bilans est une fonctionnalité prévue dans la roadmap. Le modèle de données permet déjà de retracer l'évolution des scores et des constats.",
        },
      ]}
      relatedFeatures={[
        { label: "Assistance clinique", href: "/fonctionnalites/assistance-clinique", icon: <ShieldIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
      ]}
    />
  );
}
