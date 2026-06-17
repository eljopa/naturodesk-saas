import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Agenda & rendez-vous pour naturopathes | NaturoDesk",
  description:
    "Gérez votre planning en vue semaine, acceptez les réservations en ligne et suivez les statuts de présence de vos patients — depuis un seul calendrier.",
  alternates: {
    canonical: "/fonctionnalites/agenda-rendez-vous",
  },
  openGraph: {
    title: "Agenda & rendez-vous pour naturopathes | NaturoDesk",
    description:
      "Gérez votre planning en vue semaine, acceptez les réservations en ligne et suivez les statuts de présence de vos patients — depuis un seul calendrier.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function CalIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>;
}
function GlobeIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" strokeLinecap="round"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/></svg>; }
function BillIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round"/></svg>; }
function ClockIcon()  { return <svg viewBox="0 0 24 24" style={ic}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3" strokeLinecap="round"/></svg>; }
function MailIcon()   { return <svg viewBox="0 0 24 24" style={ic}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7" strokeLinecap="round"/></svg>; }
function CheckIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M20 6 9 17l-5-5" strokeLinecap="round"/></svg>; }
function TagIcon()    { return <svg viewBox="0 0 24 24" style={ic}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82ZM7 7h.01" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function AgendaRendezVousPage() {
  return (
    <FeaturePageTemplate
      featureName="Agenda & rendez-vous"
      category="Gestion du cabinet"
      heroIcon={<CalIcon size={28} />}
      title="Votre planning centralisé, des créneaux à la consultation"
      subtitle="Gérez votre agenda en vue semaine, suivez les statuts de présence et recevez les réservations en ligne directement dans votre calendrier — sans double saisie."
      ctaPrimary={{ label: "Organiser mon agenda", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      presentationTitle="De la réservation à la séance, sans friction"
      presentationText="L'agenda NaturoDesk gère les rendez-vous créés manuellement et ceux issus de votre page publique. La vue semaine visualise votre planning par tranches horaires. Les statuts (présent, absent, annulé) permettent un suivi de l'assiduité. Chaque rendez-vous est lié au dossier du patient."
      presentationStats={[
        { value: "Vue", label: "Semaine native" },
        { value: "4", label: "Statuts de présence" },
        { value: "2", label: "Sources de réservation" },
        { value: "Email", label: "Confirmation auto" },
      ]}
      features={[
        {
          icon: <CalIcon />,
          title: "Vue semaine",
          description:
            "Visualisez votre planning sur 7 jours avec grille horaire. Naviguez d'une semaine à l'autre en un clic.",
        },
        {
          icon: <TagIcon />,
          title: "Types de rendez-vous",
          description:
            "Distinguez les bilans (première consultation, durée longue) des suivis (séances de suivi). Chaque type peut avoir une durée et un tarif distincts.",
        },
        {
          icon: <CheckIcon />,
          title: "Statuts de présence",
          description:
            "Marquez chaque rendez-vous : planifié, terminé, annulé, non présent. Ces statuts alimentent le suivi d'assiduité du patient.",
        },
        {
          icon: <GlobeIcon />,
          title: "Réservations en ligne",
          description:
            "Les réservations reçues depuis votre page professionnelle apparaissent dans un onglet dédié, prêtes à être acceptées ou gérées.",
        },
        {
          icon: <MailIcon />,
          title: "Email de confirmation",
          description:
            "Un email de confirmation est envoyé automatiquement au patient lors de la réservation en ligne. Personnalisable dans les paramètres.",
        },
        {
          icon: <ClockIcon />,
          title: "Calcul automatique des créneaux",
          description:
            "Les créneaux disponibles sur votre page publique sont calculés en temps réel à partir de vos disponibilités et des rendez-vous déjà planifiés.",
        },
      ]}
      steps={[
        {
          title: "Configurez vos disponibilités",
          description:
            "Définissez vos plages horaires hebdomadaires par jour (lundi-dimanche) dans les paramètres. Ces données alimentent le widget de réservation.",
        },
        {
          title: "Créez vos prestations",
          description:
            "Configurez vos types de consultations (bilan initial, suivi, consultation spécialisée) avec durée et tarif.",
        },
        {
          title: "Saisissez les rendez-vous manuels",
          description:
            "Depuis l'agenda, créez un rendez-vous en choisissant le patient, le type, la date et l'heure.",
        },
        {
          title: "Recevez les réservations en ligne",
          description:
            "Les patients réservent depuis votre page publique. La demande apparaît dans l'onglet 'Réservations en ligne' de l'agenda.",
        },
        {
          title: "Mettez à jour les statuts",
          description:
            "Après chaque séance, marquez le rendez-vous comme terminé et accédez directement à la consultation depuis l'agenda.",
        },
      ]}
      faqs={[
        {
          question: "Les rappels de rendez-vous sont-ils automatiques ?",
          answer:
            "Les emails de confirmation à la réservation sont automatiques. Les rappels J-1 ou J-7 sont prévus dans la roadmap.",
        },
        {
          question: "Peut-on gérer plusieurs praticiens sur le même agenda ?",
          answer:
            "Non. NaturoDesk est un outil mono-praticien. La gestion multi-praticiens (cabinet groupé) est une fonctionnalité prévue dans une version ultérieure.",
        },
        {
          question: "L'agenda est-il synchronisable avec Google Calendar ?",
          answer:
            "La synchronisation avec des calendriers externes (Google, Apple) est prévue dans la roadmap. En attendant, l'agenda NaturoDesk est le seul référentiel.",
        },
        {
          question: "Peut-on définir des plages d'indisponibilité ponctuelles ?",
          answer:
            "Les blocages ponctuels (congés, formations) sont dans la roadmap. Les plages hebdomadaires récurrentes sont déjà configurables.",
        },
      ]}
      relatedFeatures={[
        { label: "Page professionnelle", href: "/fonctionnalites/page-professionnelle", icon: <GlobeIcon /> },
        { label: "Dossiers patients", href: "/fonctionnalites/dossiers-patients", icon: <UsersIcon /> },
        { label: "Facturation", href: "/fonctionnalites/facturation", icon: <BillIcon /> },
      ]}
    />
  );
}
