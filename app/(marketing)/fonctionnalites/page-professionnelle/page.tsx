import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Page professionnelle pour naturopathes | Site web et réservation en ligne | NaturoDesk",
  description:
    "Créez votre page professionnelle de naturopathe en quelques minutes. Présentez vos prestations, affichez vos tarifs et permettez la réservation en ligne de vos consultations.",
  alternates: {
    canonical: "/fonctionnalites/page-professionnelle",
  },
  openGraph: {
    title: "Page professionnelle pour naturopathes | Site web et réservation en ligne | NaturoDesk",
    description:
      "Créez votre page professionnelle de naturopathe en quelques minutes. Présentez vos prestations, affichez vos tarifs et permettez la réservation en ligne de vos consultations.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 20, height: 20, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;
const ic2 = { ...ic, width: 18, height: 18 };

function GlobeIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round"/></svg>;
}
function UserIcon()   { return <svg viewBox="0 0 24 24" style={ic2}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round"/></svg>; }
function ListIcon()   { return <svg viewBox="0 0 24 24" style={ic2}><path d="M9 6h11M9 12h11M9 18h11M5 6v.01M5 12v.01M5 18v.01" strokeLinecap="round"/></svg>; }
function MapPinIcon() { return <svg viewBox="0 0 24 24" style={ic2}><path d="M12 21C12 21 5 13.5 5 9a7 7 0 1 1 14 0c0 4.5-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>; }
function MailIcon()   { return <svg viewBox="0 0 24 24" style={ic2}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7" strokeLinecap="round"/></svg>; }
function CalIcon()    { return <svg viewBox="0 0 24 24" style={ic2}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function EditIcon()   { return <svg viewBox="0 0 24 24" style={ic2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" style={ic2}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={ic2}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function LeafIcon()   { return <svg viewBox="0 0 24 24" style={ic2}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function PageProfessionnellePage() {
  return (
    <FeaturePageTemplate
      featureName="Page professionnelle"
      category="Visibilité & développement de cabinet"
      heroIcon={<GlobeIcon size={28} />}
      title="Votre page professionnelle de naturopathe, prête à accueillir vos futurs patients."
      subtitle="Créez une présence en ligne professionnelle sans site web complexe. Présentez votre approche, vos prestations, vos tarifs et permettez la prise de rendez-vous directement depuis votre page."
      ctaPrimary={{ label: "Créer ma page professionnelle", href: "/register" }}
      ctaSecondary={{ label: "Découvrir un exemple", href: "/p/demo" }}
      heroReassurance={[
        "Mise en ligne rapide",
        "Réservation intégrée",
        "Optimisée pour Google",
      ]}
      presentationTitle="Une présence en ligne qui inspire confiance"
      presentationText="Lorsqu'un futur patient vous découvre, il cherche avant tout à comprendre qui vous êtes, comment vous travaillez et comment prendre rendez-vous. NaturoDesk vous permet de créer une véritable page professionnelle, conçue spécialement pour les naturopathes. Vous présentez votre parcours, votre approche, vos spécialités et vos prestations dans un espace clair, moderne et adapté à votre activité. Sans WordPress. Sans maintenance technique. Sans abonnement supplémentaire."
      presentationStats={[
        { value: "< 15 min", label: "Pour publier" },
        { value: "100%", label: "Mobile-friendly" },
        { value: "0 €", label: "Outil tiers requis" },
        { value: "Auto", label: "SEO local intégré" },
      ]}
      features={[
        {
          icon: <UserIcon />,
          title: "Présentez votre activité",
          description:
            "Expliquez votre approche, votre parcours et les accompagnements que vous proposez.",
        },
        {
          icon: <ListIcon />,
          title: "Affichez vos prestations",
          description:
            "Bilans de vitalité, suivis, accompagnements spécifiques : vos services sont présentés de manière claire avec leurs durées et leurs tarifs.",
        },
        {
          icon: <MapPinIcon />,
          title: "Centralisez vos coordonnées",
          description:
            "Adresse, téléphone, email et réseaux sociaux sont accessibles en un seul endroit.",
        },
        {
          icon: <MailIcon />,
          title: "Recevez des demandes de contact",
          description:
            "Un formulaire intégré permet aux visiteurs de vous contacter facilement.",
        },
        {
          icon: <CalIcon />,
          title: "Acceptez des rendez-vous en ligne",
          description:
            "Vos patients réservent directement depuis votre page selon vos disponibilités réelles.",
        },
        {
          icon: <EditIcon />,
          title: "Faites évoluer votre contenu",
          description:
            "Modifiez votre page à tout moment depuis votre espace NaturoDesk.",
        },
      ]}
      steps={[
        {
          title: "Complétez votre profil",
          description:
            "Ajoutez votre présentation, vos coordonnées et votre photo.",
        },
        {
          title: "Configurez vos prestations",
          description:
            "Définissez vos consultations, durées et tarifs.",
        },
        {
          title: "Activez la réservation en ligne",
          description:
            "Vos disponibilités deviennent immédiatement réservables.",
        },
        {
          title: "Publiez votre page",
          description:
            "Votre page est accessible en ligne et prête à recevoir vos premiers rendez-vous.",
        },
      ]}
      faqs={[
        {
          question: "Puis-je utiliser ma page même si je n'ai pas de site internet ?",
          answer:
            "Oui. Votre page professionnelle peut parfaitement constituer votre présence principale en ligne.",
        },
        {
          question: "Puis-je afficher mes tarifs ?",
          answer:
            "Oui. Chaque prestation peut afficher sa durée et son tarif.",
        },
        {
          question: "Puis-je recevoir des rendez-vous directement depuis ma page ?",
          answer:
            "Oui. Les visiteurs peuvent réserver selon les créneaux disponibles dans votre agenda.",
        },
        {
          question: "Puis-je modifier ma page quand je le souhaite ?",
          answer:
            "Oui. Tous les contenus sont modifiables depuis votre espace NaturoDesk.",
        },
        {
          question: "La page est-elle optimisée pour Google ?",
          answer:
            "Oui. NaturoDesk génère automatiquement les éléments techniques essentiels au référencement local.",
        },
        {
          question: "Ai-je besoin de compétences techniques ?",
          answer:
            "Non. La page est conçue pour être administrée sans connaissances techniques.",
        },
      ]}
      relatedFeatures={[
        { label: "Agenda & rendez-vous", href: "/fonctionnalites/agenda-rendez-vous", icon: <CalIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
      ]}
      ctaFinalTitle="Développez votre visibilité sans complexifier votre activité"
      ctaFinalText="Concentrez-vous sur vos patients. NaturoDesk s'occupe de votre présence en ligne."
      ctaFinalPrimary={{ label: "Créer ma page professionnelle", href: "/register" }}
      ctaFinalSecondary={{ label: "Découvrir NaturoDesk", href: "/" }}
    />
  );
}
