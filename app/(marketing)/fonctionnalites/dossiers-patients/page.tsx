import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/components/marketing/feature-page-template";

export const metadata: Metadata = {
  title: "Dossiers patients pour naturopathes | Centralisez votre suivi | NaturoDesk",
  description:
    "Retrouvez l'ensemble de vos informations patients dans un espace unique. Historique, consultations, rendez-vous, factures et suivis centralisés.",
  alternates: {
    canonical: "/fonctionnalites/dossiers-patients",
  },
  openGraph: {
    title: "Dossiers patients pour naturopathes | Centralisez votre suivi | NaturoDesk",
    description:
      "Retrouvez l'ensemble de vos informations patients dans un espace unique. Historique, consultations, rendez-vous, factures et suivis centralisés.",
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
function AlertIcon()  { return <svg viewBox="0 0 24 24" style={ic}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01" strokeLinecap="round"/></svg>; }

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function DossiersPatientsPage() {
  return (
    <FeaturePageTemplate
      featureName="Dossiers patients"
      category="Gestion des patients"
      heroIcon={<UsersIcon size={28} />}
      title="Retrouvez toute l'histoire de vos patients au même endroit."
      subtitle="Centralisez les informations, consultations, rendez-vous, suivis et documents de chaque patient dans un dossier unique et structuré."
      ctaPrimary={{ label: "Essayer gratuitement", href: "/register" }}
      ctaSecondary={{ label: "Voir les tarifs", href: "/tarifs" }}
      heroReassurance={["Historique complet", "Recherche instantanée", "Suivi centralisé"]}
      presentationTitle="Ne perdez plus de temps à chercher l'information"
      presentationText="Chaque patient possède son propre espace regroupant toutes les informations utiles à son accompagnement. Retrouvez en quelques secondes les coordonnées, les consultations passées, les protocoles, les rendez-vous et les factures. Contrairement à un simple CRM, le dossier patient est directement connecté aux bilans, protocoles et suivis — pensé pour la pratique naturopathique."
      presentationStats={[
        { value: "6", label: "Sections d'historique" },
        { value: "∞", label: "Patients, quel que soit le plan" },
        { value: "PDF", label: "Export en un clic" },
        { value: "RGPD", label: "Architecture sécurisée" },
      ]}
      features={[
        {
          icon: <NoteIcon />,
          title: "Informations personnelles",
          description:
            "Nom, prénom, date de naissance, téléphone, email, adresse et profession réunis dans une fiche claire et accessible.",
        },
        {
          icon: <AlertIcon />,
          title: "Antécédents et allergies",
          description:
            "Consignez les antécédents médicaux, allergies connues et traitements en cours pour préparer chaque séance en toute sérénité.",
        },
        {
          icon: <CalIcon />,
          title: "Rendez-vous",
          description:
            "Historique complet des rendez-vous passés et à venir, avec type (bilan ou suivi), statut et source (agenda ou réservation en ligne).",
        },
        {
          icon: <PulseIcon />,
          title: "Consultations",
          description:
            "Tous les bilans et consultations de suivi sont listés avec leur statut. Accédez au contenu complet en un seul clic.",
        },
        {
          icon: <SearchIcon />,
          title: "Suivis",
          description:
            "Retrouvez l'ensemble des messages de suivi et fiches conseil remis au patient pour visualiser son évolution dans le temps.",
        },
        {
          icon: <BillIcon />,
          title: "Factures",
          description:
            "Toutes les factures émises sont accessibles depuis le dossier avec leur statut de paiement et la possibilité de télécharger le PDF.",
        },
      ]}
      steps={[
        {
          title: "Création du dossier",
          description:
            "Saisissez les informations d'identité, de contact et les données cliniques initiales : allergies, antécédents médicaux et notes libres.",
        },
        {
          title: "Réalisation des consultations",
          description:
            "Menez vos bilans et consultations de suivi depuis le dossier. Symptômes, médicaments, compléments et observations sont enregistrés séance par séance.",
        },
        {
          title: "Ajout des suivis",
          description:
            "Transmettez les protocoles et fiches conseil, consignez les évolutions et enregistrez les messages échangés avec le patient.",
        },
        {
          title: "Historique accessible à tout moment",
          description:
            "À chaque rendez-vous, retrouvez en quelques secondes l'ensemble du parcours patient pour préparer la séance et assurer la continuité du suivi.",
        },
      ]}
      faqs={[
        {
          question: "Puis-je archiver un patient ?",
          answer:
            "Oui. Le patient disparaît de la liste active mais toutes ses données (consultations, protocoles, factures) sont conservées intégralement. Il peut être réactivé à tout moment.",
        },
        {
          question: "Puis-je exporter une fiche PDF ?",
          answer:
            "Oui. Les fiches patient, comptes-rendus de consultation et protocoles peuvent être téléchargés en PDF depuis le dossier.",
        },
        {
          question: "Les consultations sont-elles conservées ?",
          answer:
            "Oui. Toutes les consultations restent accessibles indéfiniment dans le dossier, quel que soit votre plan d'abonnement.",
        },
        {
          question: "Puis-je retrouver un patient rapidement ?",
          answer:
            "Oui. La liste patients dispose d'une recherche instantanée par nom, prénom ou email avec résultats en temps réel, sans rechargement de page.",
        },
        {
          question: "Les factures sont-elles liées au dossier ?",
          answer:
            "Oui. Chaque facture émise apparaît directement dans le dossier du patient concerné avec son statut de paiement et un lien de téléchargement PDF.",
        },
        {
          question: "Puis-je gérer un grand nombre de patients ?",
          answer:
            "Le plan Starter est limité à 50 patients actifs. Les plans Growth et Pro ne comportent aucune limite sur le nombre de patients.",
        },
      ]}
      relatedFeatures={[
        { label: "Bilans de vitalité", href: "/fonctionnalites/bilans-vitalite", icon: <PulseIcon /> },
        { label: "Agenda & rendez-vous", href: "/fonctionnalites/agenda-rendez-vous", icon: <CalIcon /> },
        { label: "Protocoles & fiches conseil", href: "/fonctionnalites/protocoles", icon: <LeafIcon /> },
      ]}
      ctaFinalTitle="Centralisez enfin votre suivi patient dans un seul outil."
      ctaFinalText="Essayez NaturoDesk gratuitement. Aucune carte bancaire requise."
      ctaFinalPrimary={{ label: "Démarrer gratuitement", href: "/register" }}
      ctaFinalSecondary={{ label: "Toutes les fonctionnalités", href: "/fonctionnalites" }}
    />
  );
}
