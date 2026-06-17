import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Dossiers patients naturopathie | NaturoDesk",
  description:
    "Créez et gérez des dossiers patients complets : antécédents, allergies, rendez-vous, consultations, protocoles et factures réunis dans une fiche structurée.",
  alternates: {
    canonical: "/fonctionnalites/dossiers-patients",
  },
  openGraph: {
    title: "Dossiers patients naturopathie | NaturoDesk",
    description:
      "Créez et gérez des dossiers patients complets : antécédents, allergies, rendez-vous, consultations, protocoles et factures réunis dans une fiche structurée.",
    type: "website",
  },
};

/* ── Icons ──────────────────────────────────────────────────────────────── */
const ic = { width: 18, height: 18, stroke: "currentColor", fill: "none", strokeWidth: 2, color: "var(--nd-sage-deep)" } as const;

function UsersIcon({ size = 20 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" style={{ ...ic, width: size, height: size }}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" strokeLinecap="round"/><circle cx="17" cy="8" r="2"/><path d="M21 20c0-2.5-1.8-4-4-4" strokeLinecap="round"/></svg>;
}
function PulseIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function CalIcon()    { return <svg viewBox="0 0 24 24" style={ic}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function BillIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" strokeLinecap="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" style={ic}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35" strokeLinecap="round"/></svg>; }
function ArchiveIcon(){ return <svg viewBox="0 0 24 24" style={ic}><path d="M21 8H3M21 8V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8M21 8V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v3M10 12h4" strokeLinecap="round"/></svg>; }
function NoteIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeLinecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>; }
function LeafIcon()   { return <svg viewBox="0 0 24 24" style={ic}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DossiersPatientsPage() {
  return (
    <FeaturePageTemplate
      featureName="Dossiers patients"
      category="Gestion du cabinet"
      heroIcon={<UsersIcon size={28} />}
      title="Le dossier patient complet, du premier contact au suivi long terme"
      subtitle="Centralisez toutes les informations de vos patients dans une fiche structurée : antécédents, rendez-vous, consultations, protocoles et factures — accessibles en un seul endroit."
      ctaPrimary={{ label: "Essayer gratuitement", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      presentationTitle="Toute la relation patient, sans outil dispersé"
      presentationText="Un dossier NaturoDesk regroupe l'ensemble du parcours patient : des coordonnées à l'historique complet des consultations, en passant par les protocoles remis et les factures émises. La recherche est instantanée. L'archivage préserve les données sans encombrer la liste active."
      presentationStats={[
        { value: "5", label: "Onglets d'historique" },
        { value: "25", label: "Patients par page" },
        { value: "100%", label: "Données exportables" },
        { value: "RGPD", label: "Architecture sécurisée" },
      ]}
      features={[
        {
          icon: <NoteIcon />,
          title: "Informations complètes",
          description:
            "Nom, prénom, date de naissance, téléphone, email, adresse, profession, allergies connues et antécédents médicaux.",
        },
        {
          icon: <SearchIcon />,
          title: "Recherche instantanée",
          description:
            "Filtrez la liste par nom, prénom ou email. Résultats en temps réel sans rechargement de page.",
        },
        {
          icon: <PulseIcon />,
          title: "Historique des consultations",
          description:
            "Toutes les consultations du patient sont listées avec leur statut (brouillon, prêt, analysé). Accès direct en un clic.",
        },
        {
          icon: <CalIcon />,
          title: "Suivi des rendez-vous",
          description:
            "Historique complet des rendez-vous (passés et à venir) avec type (bilan/suivi), statut et source (agenda ou réservation en ligne).",
        },
        {
          icon: <BillIcon />,
          title: "Factures intégrées",
          description:
            "Toutes les factures émises pour ce patient sont accessibles depuis son dossier — avec statut de paiement et téléchargement PDF.",
        },
        {
          icon: <ArchiveIcon />,
          title: "Archivage sécurisé",
          description:
            "Les patients inactifs peuvent être archivés pour alléger la liste. Les données sont conservées intégralement et restent accessibles.",
        },
      ]}
      steps={[
        {
          title: "Créez la fiche patient",
          description:
            "Saisissez les informations d'identité, de contact et les données cliniques initiales (allergies, antécédents, notes libres).",
        },
        {
          title: "Planifiez le premier rendez-vous",
          description:
            "Depuis la fiche patient, créez directement un rendez-vous dans votre agenda (bilan ou consultation de suivi).",
        },
        {
          title: "Saisissez la consultation",
          description:
            "En séance, ouvrez ou créez la consultation liée. Saisissez symptômes, médicaments, compléments et observations cliniques.",
        },
        {
          title: "Remettez la fiche conseil",
          description:
            "Créez le protocole naturopathique depuis la consultation. Téléchargez le PDF et archivez-le dans le dossier.",
        },
        {
          title: "Émettez la facture",
          description:
            "Créez la facture depuis le dossier, enregistrez le paiement et téléchargez le PDF pour le patient.",
        },
      ]}
      faqs={[
        {
          question: "Les données patients sont-elles chiffrées ?",
          answer:
            "Les données sont stockées dans une base PostgreSQL hébergée sur Supabase (infrastructure AWS EU), avec Row Level Security activée. Chaque praticien n'accède qu'à ses propres données.",
        },
        {
          question: "Peut-on importer des patients depuis un autre logiciel ?",
          answer:
            "L'import en masse (CSV) est prévu dans la roadmap. En attendant, la création est manuelle ou via l'API publique de réservation (qui crée automatiquement le patient s'il n'existe pas).",
        },
        {
          question: "Que se passe-t-il quand on archive un patient ?",
          answer:
            "Le patient disparaît de la liste active mais toutes ses données (consultations, protocoles, factures) sont conservées. Il peut être réactivé à tout moment.",
        },
        {
          question: "Y a-t-il une limite au nombre de patients ?",
          answer:
            "Le plan Starter est limité à 50 patients actifs. Les plans Growth et Pro n'ont pas de limite sur le nombre de patients.",
        },
      ]}
      relatedFeatures={[
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <PulseIcon /> },
        { label: "Agenda & rendez-vous", href: "/fonctionnalites/agenda-rendez-vous", icon: <CalIcon /> },
        { label: "Facturation", href: "/fonctionnalites/facturation", icon: <BillIcon /> },
      ]}
    />
  );
}
