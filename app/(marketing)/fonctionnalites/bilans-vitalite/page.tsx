import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Bilans de vitalité pour naturopathes | Structurez vos consultations | NaturoDesk",
  description:
    "Organisez vos consultations grâce à des bilans de vitalité structurés intégrant symptômes, traitements, compléments et observations.",
  alternates: {
    canonical: "/fonctionnalites/bilans-vitalite",
  },
  openGraph: {
    title: "Bilans de vitalité pour naturopathes | Structurez vos consultations | NaturoDesk",
    description:
      "Organisez vos consultations grâce à des bilans de vitalité structurés intégrant symptômes, traitements, compléments et observations.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function PulseIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>;
}
function ShieldIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
function LeafIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function UsersIcon()   { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function LayersIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round"/></svg>; }
function PillIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="m10.5 20.5-7-7a5 5 0 0 1 7-7l7 7a5 5 0 0 1-7 7ZM8.5 8.5l7 7" strokeLinecap="round"/></svg>; }
function ListIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" strokeLinecap="round"/></svg>; }
function NoteIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>; }
function GridIcon()    { return <svg viewBox="0 0 24 24" style={ic}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BilansVitaliePage() {
  return (
    <FeaturePageTemplate
      featureName="Bilans de vitalité"
      category="Consultations & analyse"
      heroIcon={<PulseIcon size={28} />}
      title="Structurez vos consultations et facilitez votre analyse."
      subtitle="Collectez les informations essentielles de manière organisée afin d'obtenir une vision plus claire du terrain de vos patients."
      ctaPrimary={{ label: "Essayer gratuitement", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      heroReassurance={["Consultation structurée", "Historique exploitable", "Analyse documentée"]}
      presentationTitle="Une consultation mieux organisée"
      presentationText="NaturoDesk vous accompagne dans la collecte des informations essentielles sans modifier votre méthode de travail. Les données saisies sont organisées par onglets thématiques afin de faciliter leur exploitation lors du suivi. Chaque bilan reste disponible et consultable dans le temps — pour retracer l'évolution du patient à chaque nouvelle séance."
      presentationStats={[
        { value: "6", label: "Onglets de saisie" },
        { value: "4", label: "Étapes de workflow" },
        { value: "PDF", label: "Export consultation" },
        { value: "100%", label: "Données conservées" },
      ]}
      features={[
        {
          icon: <GridIcon />,
          title: "Contexte général",
          description:
            "Renseignez le motif de consultation, les objectifs du patient et les données contextuelles initiales qui fondent l'analyse.",
        },
        {
          icon: <ListIcon />,
          title: "Symptômes",
          description:
            "Saisissez les symptômes système par système (digestif, nerveux, ostéo-articulaire…) pour obtenir une vision anatomique complète du terrain.",
        },
        {
          icon: <PillIcon />,
          title: "Médicaments",
          description:
            "Enregistrez les traitements en cours. Les médicaments sont identifiés dans la base de données publique officielle (BDPM).",
        },
        {
          icon: <LeafIcon />,
          title: "Compléments alimentaires",
          description:
            "Listez les compléments pris par le patient avec posologie et raison de la prise, pour un suivi précis et tracé.",
        },
        {
          icon: <NoteIcon />,
          title: "Observations",
          description:
            "Notez librement vos observations cliniques, remarques et points d'attention particuliers à conserver pour les séances suivantes.",
        },
        {
          icon: <LayersIcon />,
          title: "Constats",
          description:
            "Les éléments issus de l'analyse documentaire sont regroupés et classés par catégorie pour faciliter la rédaction du protocole.",
        },
      ]}
      steps={[
        {
          title: "Création du bilan",
          description:
            "Ouvrez un nouveau bilan depuis la fiche patient. Choisissez le type de consultation (bilan initial ou séance de suivi).",
        },
        {
          title: "Saisie des données",
          description:
            "Renseignez chaque onglet à votre rythme : contexte général, symptômes, médicaments, compléments alimentaires et observations.",
        },
        {
          title: "Analyse documentaire",
          description:
            "Déclenchez l'analyse. Le moteur croise les données saisies avec les bases documentaires de référence et retourne les constats classés.",
        },
        {
          title: "Exploitation des résultats",
          description:
            "Consultez les constats identifiés, annotez ceux qui sont pertinents et créez la fiche conseil depuis ce même écran.",
        },
      ]}
      faqs={[
        {
          question: "Puis-je enregistrer les traitements ?",
          answer:
            "Oui. Médicaments et compléments alimentaires disposent chacun d'un onglet dédié dans le bilan.",
        },
        {
          question: "Les symptômes sont-ils historisés ?",
          answer:
            "Oui. Chaque bilan conserve les symptômes saisis. Vous pouvez retracer l'évolution du patient de consultation en consultation depuis la fiche patient.",
        },
        {
          question: "Puis-je exporter le bilan ?",
          answer:
            "Oui. Le compte-rendu de consultation est exportable en PDF depuis la fiche patient.",
        },
        {
          question: "Les analyses sont-elles conservées ?",
          answer:
            "Oui. Les résultats de chaque analyse documentaire sont sauvegardés dans le bilan correspondant et restent consultables à tout moment.",
        },
        {
          question: "Puis-je retrouver un ancien bilan ?",
          answer:
            "Oui. Tous les bilans sont accessibles depuis la fiche patient, classés chronologiquement, sans limitation de durée.",
        },
        {
          question: "Les données restent-elles modifiables ?",
          answer:
            "Oui. Un bilan peut être réouvert en mode édition à tout moment pour compléter ou corriger les informations saisies, puis soumis à une nouvelle analyse.",
        },
      ]}
      relatedFeatures={[
        { label: "Assistance clinique", href: "/fonctionnalites/assistance-clinique", icon: <ShieldIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
      ]}
      ctaFinalTitle="Donnez une structure claire à chacune de vos consultations."
      ctaFinalText="Essayez NaturoDesk gratuitement. Aucune carte bancaire requise."
      ctaFinalPrimary={{ label: "Démarrer gratuitement", href: "/register" }}
      ctaFinalSecondary={{ label: "Toutes les fonctionnalités", href: "/fonctionnalites" }}
    />
  );
}
