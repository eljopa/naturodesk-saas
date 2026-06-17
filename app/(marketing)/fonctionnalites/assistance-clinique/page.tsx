import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Assistance clinique pour naturopathes | NaturoDesk",
  description:
    "Identifiez les interactions médicamenteuses, les déplétions nutritionnelles et les effets indésirables à partir de sources documentaires officielles (BDPM, NIH).",
  alternates: {
    canonical: "/fonctionnalites/assistance-clinique",
  },
  openGraph: {
    title: "Assistance clinique pour naturopathes | NaturoDesk",
    description:
      "Identifiez les interactions médicamenteuses, les déplétions nutritionnelles et les effets indésirables à partir de sources documentaires officielles (BDPM, NIH).",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function ShieldIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>;
}
function PulseIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function LeafIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function LinkIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round"/></svg>; }
function DbIcon()     { return <svg viewBox="0 0 24 24" style={ic}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" strokeLinecap="round"/></svg>; }
function AlertIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" style={ic}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AssistanceCliniqueePage() {
  return (
    <FeaturePageTemplate
      featureName="Assistance clinique"
      category="Aide à la décision"
      heroIcon={<ShieldIcon size={28} />}
      title="Une base documentaire clinique au cœur de chaque consultation"
      subtitle="Identifiez les interactions médicamenteuses, les déplétions nutritionnelles et les effets indésirables à partir de sources officielles — sans quitter votre logiciel."
      ctaPrimary={{ label: "Découvrir l'assistance clinique", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      presentationTitle="L'aide à la décision, pas le diagnostic"
      presentationText="NaturoDesk croise les données cliniques saisies (symptômes, médicaments, compléments) avec des bases de données publiques officielles : BDPM/ANSM, NIH Office of Dietary Supplements. Les signaux identifiés sont classés par niveau de fiabilité et toujours tracés jusqu'à leur source primaire. Le praticien reste seul juge de la pertinence clinique."
      presentationStats={[
        { value: "BDPM", label: "Base officielle ANSM" },
        { value: "NIH ODS", label: "Compléments alimentaires" },
        { value: "4 tiers", label: "Hiérarchie des sources" },
        { value: "100%", label: "Résultats traçables" },
      ]}
      features={[
        {
          icon: <LinkIcon />,
          title: "Interactions médicamenteuses",
          description:
            "Détection des interactions entre substances à partir des prédicats documentaires (INTERACTS_WITH) issus des RCP officiels.",
        },
        {
          icon: <AlertIcon />,
          title: "Effets indésirables connus",
          description:
            "Croisement des médicaments déclarés avec le catalogue DrugSideEffect : fréquence (très fréquent → très rare), sévérité et temporalité.",
        },
        {
          icon: <DbIcon />,
          title: "Déplétions nutritionnelles",
          description:
            "Identification des carences induites par les médicaments (ex. Metformine → Vitamine B12). La chaîne substance → nutriment → symptôme est complète et auditable.",
        },
        {
          icon: <SearchIcon />,
          title: "Recherche sémantique",
          description:
            "Recherche par langage naturel dans la base documentaire via embeddings vectoriels. Trouvez une information sans connaître le terme exact.",
        },
        {
          icon: <PulseIcon />,
          title: "Score de charge médicamenteuse",
          description:
            "Évaluation quantifiée de la complexité du traitement en cours (0–10) avec niveau d'alerte : LOW / MEDIUM / HIGH / CRITICAL.",
        },
        {
          icon: <LeafIcon />,
          title: "Constats structurés",
          description:
            "Les signaux sont catégorisés : effet indésirable, interaction, déplétion, signal d'alerte, terrain, protocole, question — annotables et validables par le praticien.",
        },
      ]}
      steps={[
        {
          title: "Saisie des données cliniques",
          description:
            "Le praticien saisit les symptômes, médicaments et compléments dans l'interface de bilan. Le texte libre est analysé et normalisé automatiquement.",
        },
        {
          title: "Normalisation et résolution",
          description:
            "Les médicaments sont résolus dans la BDPM (substance active + spécialité commerciale). Les compléments sont résolus dans le catalogue NIH ODS.",
        },
        {
          title: "Analyse documentaire",
          description:
            "Le moteur croise les données avec les sources officielles selon une hiérarchie de 4 tiers. Chaque signal est scoré et tracé jusqu'à sa source primaire.",
        },
        {
          title: "Revue des constats",
          description:
            "Le praticien consulte les constats classés par catégorie. Il valide, annote ou ignore chaque signal selon son jugement clinique.",
        },
      ]}
      faqs={[
        {
          question: "L'assistance clinique pose-t-elle un diagnostic ?",
          answer:
            "Non. NaturoDesk est un outil d'aide à la décision documentaire. Il identifie des signaux connus dans des bases publiques officielles. La signification clinique reste à l'appréciation exclusive du praticien.",
        },
        {
          question: "Quelles sources sont utilisées ?",
          answer:
            "La Base de Données Publique des Médicaments (BDPM/ANSM) pour les médicaments, le NIH Office of Dietary Supplements (ODS) pour les compléments alimentaires, et des études PubMed sélectionnées.",
        },
        {
          question: "Comment est déterminé le niveau de fiabilité d'un signal ?",
          answer:
            "Un score de confiance (0–0.90) est calculé à partir de la fréquence de l'effet, du niveau de preuve de la source, de la cohérence temporelle et d'une éventuelle corroboration par d'autres faits structurés.",
        },
        {
          question: "Le LLM invente-t-il des relations cliniques ?",
          answer:
            "Non. Le modèle de langage est utilisé uniquement pour reformuler en langage naturel des constats déjà établis par la base structurée. Il ne crée aucune relation clinique et n'invente aucune information.",
        },
      ]}
      relatedFeatures={[
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <PulseIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
      ]}
    />
  );
}
