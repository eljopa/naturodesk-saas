import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Page professionnelle pour naturopathes | NaturoDesk",
  description:
    "Créez votre vitrine en ligne professionnelle et permettez la réservation directe de vos consultations depuis votre page publique.",
  alternates: {
    canonical: "/fonctionnalites/page-professionnelle",
  },
  openGraph: {
    title: "Page professionnelle pour naturopathes | NaturoDesk",
    description:
      "Créez votre vitrine en ligne professionnelle et permettez la réservation directe de vos consultations depuis votre page publique.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 20, height: 20, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;
const ic2 = { ...ic, width: 18, height: 18 };

function GlobeIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round"/></svg>;
}
function CalIcon()  { return <svg viewBox="0 0 24 24" style={ic2}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function StarIcon() { return <svg viewBox="0 0 24 24" style={ic2}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" style={ic2}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>; }
function LinkIcon()  { return <svg viewBox="0 0 24 24" style={ic2}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" strokeLinecap="round"/></svg>; }
function ImageIcon() { return <svg viewBox="0 0 24 24" style={ic2}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21" strokeLinecap="round"/></svg>; }
function UsersIcon() { return <svg viewBox="0 0 24 24" style={ic2}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function ShieldIcon(){ return <svg viewBox="0 0 24 24" style={ic2}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
function LeafIcon()  { return <svg viewBox="0 0 24 24" style={ic2}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function PageProfessionnellePage() {
  return (
    <FeaturePageTemplate
      featureName="Page professionnelle"
      category="Visibilité & acquisition"
      heroIcon={<GlobeIcon size={28} />}
      title="Votre vitrine en ligne, connectée à votre cabinet"
      subtitle="Créez une page publique professionnelle en quelques minutes. Présentez vos prestations, vos tarifs et permettez à vos patients de réserver directement en ligne — sans outil tiers."
      ctaPrimary={{ label: "Créer ma page gratuitement", href: "/register" }}
      ctaSecondary={{ label: "Voir un exemple", href: "/tarifs" }}
      presentationTitle="Une page qui travaille pour vous, même quand le cabinet est fermé"
      presentationText="La page professionnelle NaturoDesk est directement connectée à votre logiciel : vos prestations, vos disponibilités et vos informations de contact sont synchronisées en temps réel. Publiez en un clic. Aucune compétence technique requise."
      presentationStats={[
        { value: "10", label: "Thèmes graphiques" },
        { value: "< 15 min", label: "Pour publier" },
        { value: "100%", label: "Mobile-friendly" },
        { value: "0 €", label: "Outil tiers requis" },
      ]}
      features={[
        {
          icon: <StarIcon />,
          title: "Présentation personnalisée",
          description:
            "Bio, approche, photo de profil, spécialités — composez votre page avec vos propres mots et votre propre identité.",
        },
        {
          icon: <CalIcon />,
          title: "Réservation en ligne intégrée",
          description:
            "Widget de réservation multi-étapes connecté à votre agenda. Le patient choisit sa prestation et son créneau, sans appel téléphonique.",
        },
        {
          icon: <SearchIcon />,
          title: "SEO local optimisé",
          description:
            "Balises Schema.org LocalBusiness + MedicalBusiness générées automatiquement. Votre page est indexable par Google dès la publication.",
        },
        {
          icon: <ImageIcon />,
          title: "10 thèmes graphiques",
          description:
            "Choisissez parmi 10 thèmes de couleurs et une galerie d'images hero. Personnalisation sans code.",
        },
        {
          icon: <LinkIcon />,
          title: "URL stable et verrouillée",
          description:
            "Votre slug est verrouillé à la première publication pour préserver votre référencement dans la durée.",
        },
        {
          icon: <UsersIcon />,
          title: "Formulaire de contact intégré",
          description:
            "Les messages reçus arrivent directement dans NaturoDesk avec statut de lecture, notes internes et suivi.",
        },
      ]}
      steps={[
        {
          title: "Renseignez vos informations",
          description:
            "Bio, présentation, adresse, téléphone, email de contact, réseaux sociaux et sections de spécialités.",
        },
        {
          title: "Configurez vos prestations",
          description:
            "Ajoutez vos consultations avec durée et tarif. Elles s'affichent automatiquement sur la page publique.",
        },
        {
          title: "Définissez vos disponibilités",
          description:
            "Configurez vos plages horaires hebdomadaires dans l'agenda. Le widget de réservation calcule les créneaux disponibles en temps réel.",
        },
        {
          title: "Publiez en un clic",
          description:
            "Aperçu avant publication disponible. Votre page est en ligne en quelques secondes.",
        },
      ]}
      faqs={[
        {
          question: "À quel plan la page professionnelle est-elle disponible ?",
          answer:
            "La page professionnelle est disponible à partir du plan Growth. Elle inclut la personnalisation, le SEO et le formulaire de contact. La réservation en ligne est incluse à partir du plan Pro.",
        },
        {
          question: "Puis-je utiliser mon propre nom de domaine ?",
          answer:
            "Votre page est publiée sur une URL NaturoDesk (naturodesk.fr/p/votre-slug). La gestion de domaine personnalisé est une fonctionnalité prévue dans la roadmap.",
        },
        {
          question: "Que se passe-t-il quand un patient réserve en ligne ?",
          answer:
            "Le rendez-vous est créé automatiquement dans votre agenda NaturoDesk, visible dans l'onglet 'Réservations en ligne'. Vous recevez une notification par email.",
        },
        {
          question: "Mon slug peut-il être modifié après publication ?",
          answer:
            "Non — pour protéger votre référencement, le slug est verrouillé définitivement à la première publication. Choisissez-le avec soin avant de publier.",
        },
      ]}
      relatedFeatures={[
        { label: "Agenda & rendez-vous", href: "/fonctionnalites/agenda-rendez-vous", icon: <CalIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
        { label: "Assistance clinique", href: "/fonctionnalites/assistance-clinique", icon: <ShieldIcon /> },
      ]}
    />
  );
}
