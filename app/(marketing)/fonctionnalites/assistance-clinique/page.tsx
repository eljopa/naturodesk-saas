import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Assistance clinique pour naturopathes | Interactions, effets secondaires et déplétions | NaturoDesk",
  description:
    "Analysez plus rapidement les traitements, les effets secondaires, les interactions et les déplétions nutritionnelles grâce à une base documentaire structurée conçue pour les naturopathes.",
  alternates: {
    canonical: "/fonctionnalites/assistance-clinique",
  },
  openGraph: {
    title: "Assistance clinique pour naturopathes | Interactions, effets secondaires et déplétions | NaturoDesk",
    description:
      "Analysez plus rapidement les traitements, les effets secondaires, les interactions et les déplétions nutritionnelles grâce à une base documentaire structurée conçue pour les naturopathes.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function ShieldIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>;
}
function PillIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="M8.5 8.5 15.5 15.5" strokeLinecap="round"/></svg>; }
function AlertIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg>; }
function LinkIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round"/></svg>; }
function LeafIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function EyeIcon()     { return <svg viewBox="0 0 24 24" style={ic}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>; }
function ClockIcon()   { return <svg viewBox="0 0 24 24" style={ic}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/></svg>; }
function PulseIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function UsersIcon()   { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AssistanceCliniqueePage() {
  return (
    <FeaturePageTemplate
      featureName="Assistance clinique"
      category="Assistance clinique & documentation"
      heroIcon={<ShieldIcon size={28} />}
      title="Gagnez du temps dans vos recherches documentaires."
      subtitle="NaturoDesk vous aide à identifier rapidement les effets secondaires connus, les interactions documentées et les déplétions nutritionnelles associées aux traitements déclarés par vos patients."
      ctaPrimary={{ label: "Découvrir l'assistance clinique", href: "/register" }}
      ctaSecondary={{ label: "Voir le fonctionnement", href: "/tarifs" }}
      heroReassurance={[
        "Basé sur des sources publiques de santé",
        "Informations traçables et documentées",
        "Outil d'aide à la décision",
      ]}
      presentationTitle="Une aide documentaire pendant vos consultations"
      presentationText="De nombreux patients consultent aujourd'hui tout en suivant un ou plusieurs traitements médicamenteux. Retrouver les effets secondaires potentiels, les déplétions nutritionnelles associées ou certaines interactions documentées demande souvent de longues recherches. NaturoDesk centralise ces informations pour vous permettre d'accéder plus rapidement aux éléments utiles à votre réflexion clinique. Le praticien reste toujours décisionnaire."
      presentationStats={[
        { value: "BDPM", label: "Base officielle ANSM" },
        { value: "NIH ODS", label: "Compléments alimentaires" },
        { value: "100%", label: "Résultats traçables" },
        { value: "0", label: "Diagnostic posé" },
      ]}
      features={[
        {
          icon: <PillIcon />,
          title: "Médicaments",
          description:
            "Identification et normalisation des traitements déclarés par le patient à partir de la Base de Données Publique des Médicaments.",
        },
        {
          icon: <AlertIcon />,
          title: "Effets secondaires",
          description:
            "Consultation des effets indésirables documentés et de leur fréquence lorsqu'ils sont disponibles.",
        },
        {
          icon: <LinkIcon />,
          title: "Interactions",
          description:
            "Identification des interactions connues entre substances et traitements.",
        },
        {
          icon: <LeafIcon />,
          title: "Déplétions nutritionnelles",
          description:
            "Mise en évidence des nutriments pouvant être impactés par certains médicaments.",
        },
        {
          icon: <EyeIcon />,
          title: "Signaux de vigilance",
          description:
            "Détection des points nécessitant une attention particulière lors de l'entretien.",
        },
        {
          icon: <ClockIcon />,
          title: "Historique des analyses",
          description:
            "Conservation des résultats dans le dossier du patient pour faciliter le suivi.",
        },
      ]}
      steps={[
        {
          title: "Saisie du contexte patient",
          description:
            "Symptômes, traitements et compléments alimentaires sont enregistrés dans le bilan.",
        },
        {
          title: "Analyse documentaire",
          description:
            "Les données sont comparées aux bases documentaires structurées.",
        },
        {
          title: "Identification des constats",
          description:
            "Les signaux pertinents sont regroupés et classés.",
        },
        {
          title: "Validation par le praticien",
          description:
            "Chaque constat peut être analysé, annoté ou ignoré selon le contexte clinique.",
        },
      ]}
      faqs={[
        {
          question: "NaturoDesk réalise-t-il un diagnostic ?",
          answer:
            "Non. NaturoDesk ne pose aucun diagnostic et ne remplace pas un professionnel de santé.",
        },
        {
          question: "Les informations sont-elles sourcées ?",
          answer:
            "Oui. Les données utilisées proviennent de bases documentaires publiques et de sources identifiées.",
        },
        {
          question: "Puis-je consulter les effets secondaires d'un médicament ?",
          answer:
            "Oui, lorsqu'ils sont disponibles dans les sources documentaires intégrées.",
        },
        {
          question: "Les interactions sont-elles vérifiées automatiquement ?",
          answer:
            "Le système identifie les interactions documentées présentes dans ses bases de connaissances.",
        },
        {
          question: "Puis-je utiliser l'assistance clinique pour préparer un protocole ?",
          answer:
            "Oui. Les constats identifiés peuvent aider à structurer votre réflexion avant la rédaction du protocole.",
        },
        {
          question: "L'assistance clinique remplace-t-elle mes recherches ?",
          answer:
            "Non. Elle permet de gagner du temps mais ne remplace pas le jugement du praticien.",
        },
      ]}
      relatedFeatures={[
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <PulseIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
      ]}
      ctaFinalTitle="Travaillez avec une documentation mieux organisée"
      ctaFinalText="Accédez plus rapidement aux informations utiles tout en conservant votre liberté d'analyse."
      ctaFinalPrimary={{ label: "Découvrir NaturoDesk", href: "/register" }}
      ctaFinalSecondary={{ label: "Voir les protocoles", href: "/fonctionnalites/protocoles" }}
    />
  );
}
