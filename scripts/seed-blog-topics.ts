/**
 * scripts/seed-blog-topics.ts
 *
 * Amorce le calendrier éditorial du blog business naturopathie (spec §10) :
 * ~40 BlogTopic répartis sur les 6 clusters selon les poids du spec §5.1
 * (INSTALLATION 15%, REGLEMENTATION_JURIDIQUE 10%, ACQUISITION_CLIENTELE 20%,
 * COMMUNICATION_VISIBILITE 20%, GESTION_OUTILS 20%, DEVELOPPEMENT_ACTIVITE 15%).
 *
 * Un article "pilier" par cluster (priority basse), les autres pointent vers
 * lui via pillarSlug + quelques relatedSlugs vers des sujets voisins du même
 * cluster. Un sujet PREUVE par cluster à fort volume (comparatif/benchmark).
 *
 * Idempotent : upsert par slug (unique), ne touche pas les sujets déjà
 * présents (pas d'écrasement d'un topic déjà en cours de génération/publié).
 *
 * Usage :
 *   npx tsx scripts/seed-blog-topics.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

import { PrismaClient, type BlogCluster, type BlogContentType, type BlogPersona } from "@prisma/client";

const db = new PrismaClient();

interface SeedTopic {
  slug: string;
  cluster: BlogCluster;
  persona: BlogPersona;
  contentType: BlogContentType;
  keyword: string;
  secondaryKeywords: string[];
  priority: number;
  pillarSlug?: string;
  relatedSlugs?: string[];
  naturodeskContext: string;
}

const INSTALLATION_PILLAR = "ouvrir-son-cabinet-de-naturopathie-guide-complet";
const REGLEMENTATION_PILLAR = "reglementation-naturopathie-france-guide";
const ACQUISITION_PILLAR = "comment-obtenir-ses-premiers-clients-naturopathie";
const COMMUNICATION_PILLAR = "comment-se-faire-connaitre-comme-naturopathe";
const GESTION_PILLAR = "quels-outils-de-gestion-pour-un-naturopathe";
const DEVELOPPEMENT_PILLAR = "comment-fixer-ses-tarifs-de-consultation-en-naturopathie";

const TOPICS: SeedTopic[] = [
  // ── INSTALLATION (15%) ─────────────────────────────────────────────────────
  {
    slug: INSTALLATION_PILLAR,
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "ouvrir son cabinet de naturopathie",
    secondaryKeywords: ["installation naturopathe", "devenir naturopathe indépendant", "lancer son activité de naturopathe"],
    priority: 10,
    relatedSlugs: [
      "quel-statut-juridique-pour-un-naturopathe",
      "budget-installation-cabinet-naturopathie",
      "comment-choisir-son-local-de-naturopathie",
    ],
    naturodeskContext:
      "Présente NaturoDesk comme l'outil qui accompagne dès le premier jour (agenda, facturation, dossiers patients) sans configuration lourde.",
  },
  {
    slug: "quel-statut-juridique-pour-un-naturopathe",
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "quel statut juridique pour un naturopathe",
    secondaryKeywords: ["micro-entreprise naturopathe", "EI naturopathe", "statut naturopathe indépendant"],
    priority: 20,
    pillarSlug: INSTALLATION_PILLAR,
    relatedSlugs: [INSTALLATION_PILLAR, "budget-installation-cabinet-naturopathie"],
    naturodeskContext: "Mentionne que NaturoDesk génère des factures conformes quel que soit le statut choisi (micro-entreprise ou société).",
  },
  {
    slug: "budget-installation-cabinet-naturopathie",
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "budget installation cabinet de naturopathie",
    secondaryKeywords: ["combien coûte l'installation d'un naturopathe", "investissement de départ naturopathe"],
    priority: 30,
    pillarSlug: INSTALLATION_PILLAR,
    relatedSlugs: [INSTALLATION_PILLAR, "quel-statut-juridique-pour-un-naturopathe"],
    naturodeskContext: "Situe le coût d'un logiciel de gestion comme NaturoDesk dans le budget global d'installation (poste raisonnable face au gain de temps).",
  },
  {
    slug: "comment-choisir-son-local-de-naturopathie",
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "TUTORIEL",
    keyword: "choisir son local de naturopathie",
    secondaryKeywords: ["cabinet partagé naturopathe", "louer un local naturopathe"],
    priority: 40,
    pillarSlug: INSTALLATION_PILLAR,
    relatedSlugs: [INSTALLATION_PILLAR],
    naturodeskContext: "Évoque la page web professionnelle NaturoDesk pour indiquer facilement l'adresse du cabinet aux nouveaux clients.",
  },
  {
    slug: "check-list-demarches-administratives-naturopathe",
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "démarches administratives naturopathe",
    secondaryKeywords: ["formalités installation naturopathe", "immatriculation naturopathe"],
    priority: 50,
    pillarSlug: INSTALLATION_PILLAR,
    relatedSlugs: [INSTALLATION_PILLAR, REGLEMENTATION_PILLAR],
    naturodeskContext: "Souligne que la facturation et le suivi administratif quotidien sont ensuite simplifiés par NaturoDesk une fois l'immatriculation faite.",
  },
  {
    slug: "naturopathe-salarie-ou-independant",
    cluster: "INSTALLATION",
    persona: "INSTALLATION",
    contentType: "TUTORIEL",
    keyword: "naturopathe salarié ou indépendant",
    secondaryKeywords: ["travailler en institut vs cabinet propre", "premier emploi naturopathe"],
    priority: 60,
    pillarSlug: INSTALLATION_PILLAR,
    naturodeskContext: "Positionne NaturoDesk comme l'outil qui rend l'indépendance plus accessible en réduisant la charge administrative solo.",
  },

  // ── REGLEMENTATION_JURIDIQUE (10%) ──────────────────────────────────────────
  {
    slug: REGLEMENTATION_PILLAR,
    cluster: "REGLEMENTATION_JURIDIQUE",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "réglementation naturopathie France",
    secondaryKeywords: ["cadre légal naturopathe", "naturopathie profession non réglementée"],
    priority: 15,
    relatedSlugs: ["assurance-rc-pro-naturopathe", "naturopathe-et-code-de-deontologie", "naturopathe-mentions-obligatoires-facture"],
    naturodeskContext: "Rappelle que NaturoDesk aide à rester dans un cadre professionnel rigoureux (factures conformes, dossiers patients structurés) sans jamais suggérer d'acte médical.",
  },
  {
    slug: "assurance-rc-pro-naturopathe",
    cluster: "REGLEMENTATION_JURIDIQUE",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "assurance RC Pro naturopathe",
    secondaryKeywords: ["responsabilité civile professionnelle naturopathe", "assurance obligatoire naturopathe"],
    priority: 70,
    pillarSlug: REGLEMENTATION_PILLAR,
    relatedSlugs: [REGLEMENTATION_PILLAR],
    naturodeskContext: "Mentionne que conserver un dossier patient structuré (comme dans NaturoDesk) est utile en cas de sinistre couvert par l'assurance RC Pro.",
  },
  {
    slug: "naturopathe-et-code-de-deontologie",
    cluster: "REGLEMENTATION_JURIDIQUE",
    persona: "INSTALLATION",
    contentType: "GUIDE",
    keyword: "déontologie naturopathe",
    secondaryKeywords: ["code de déontologie naturopathie", "limites du métier de naturopathe"],
    priority: 80,
    pillarSlug: REGLEMENTATION_PILLAR,
    naturodeskContext: "Évoque brièvement que les fiches conseil générées dans NaturoDesk restent toujours du ressort du bien-être, jamais du diagnostic médical.",
  },
  {
    slug: "naturopathe-mentions-obligatoires-facture",
    cluster: "REGLEMENTATION_JURIDIQUE",
    persona: "INSTALLATION",
    contentType: "TUTORIEL",
    keyword: "mentions obligatoires facture naturopathe",
    secondaryKeywords: ["facturation naturopathe légal", "numéro SIRET facture naturopathe"],
    priority: 90,
    pillarSlug: REGLEMENTATION_PILLAR,
    naturodeskContext: "Présente le module de facturation NaturoDesk qui pré-remplit automatiquement les mentions légales obligatoires.",
  },

  // ── ACQUISITION_CLIENTELE (20%) ─────────────────────────────────────────────
  {
    slug: ACQUISITION_PILLAR,
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "comment obtenir ses premiers clients en naturopathie",
    secondaryKeywords: ["trouver ses premiers patients naturopathe", "démarrer sa patientèle"],
    priority: 12,
    relatedSlugs: [
      "5-canaux-pour-trouver-des-clients-en-naturopathie",
      "comment-fideliser-sa-patientele-naturopathie",
      "bouche-a-oreille-naturopathe-comment-l-activer",
    ],
    naturodeskContext: "Présente la page web professionnelle et le module de réservation en ligne NaturoDesk comme premier levier d'acquisition.",
  },
  {
    slug: "5-canaux-pour-trouver-des-clients-en-naturopathie",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "trouver des clients en naturopathie",
    secondaryKeywords: ["canaux acquisition naturopathe", "attirer des patients naturopathie"],
    priority: 100,
    pillarSlug: ACQUISITION_PILLAR,
    relatedSlugs: [ACQUISITION_PILLAR, COMMUNICATION_PILLAR],
    naturodeskContext: "Relie chaque canal évoqué à une fonctionnalité concrète de NaturoDesk (page web, réservation en ligne, avis) quand c'est pertinent.",
  },
  {
    slug: "comment-fideliser-sa-patientele-naturopathie",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "TUTORIEL",
    keyword: "fidéliser sa patientèle naturopathie",
    secondaryKeywords: ["suivi patient naturopathe", "relance patient naturopathie"],
    priority: 110,
    pillarSlug: ACQUISITION_PILLAR,
    relatedSlugs: [ACQUISITION_PILLAR, DEVELOPPEMENT_PILLAR],
    naturodeskContext: "Montre comment le suivi patient et les rappels de rendez-vous NaturoDesk facilitent la fidélisation sans effort manuel.",
  },
  {
    slug: "bouche-a-oreille-naturopathe-comment-l-activer",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "bouche à oreille naturopathe",
    secondaryKeywords: ["recommandation client naturopathe", "parrainage naturopathie"],
    priority: 120,
    pillarSlug: ACQUISITION_PILLAR,
    naturodeskContext: "Suggère que la page professionnelle NaturoDesk facilite le partage/la recommandation par les patients satisfaits.",
  },
  {
    slug: "partenariats-locaux-naturopathe-comment-les-nouer",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "TUTORIEL",
    keyword: "partenariats locaux naturopathe",
    secondaryKeywords: ["réseau professionnel naturopathe", "collaborer avec d'autres praticiens"],
    priority: 130,
    pillarSlug: ACQUISITION_PILLAR,
    naturodeskContext: "Mentionne que la gestion d'agenda centralisée NaturoDesk facilite la coordination avec des praticiens partenaires.",
  },
  {
    slug: "avis-clients-naturopathe-comment-les-obtenir",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "TUTORIEL",
    keyword: "avis clients naturopathe",
    secondaryKeywords: ["obtenir des témoignages naturopathe", "réputation en ligne naturopathe"],
    priority: 140,
    pillarSlug: ACQUISITION_PILLAR,
    naturodeskContext: "Évoque le moment post-consultation dans NaturoDesk comme opportunité naturelle pour solliciter un avis.",
  },
  {
    slug: "plateformes-de-reservation-en-ligne-naturopathe",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "COMPARATIF",
    keyword: "réservation en ligne naturopathe",
    secondaryKeywords: ["prise de rendez-vous en ligne naturopathie", "outil de booking naturopathe"],
    priority: 150,
    pillarSlug: ACQUISITION_PILLAR,
    naturodeskContext: "Positionne le module de réservation en ligne intégré à la page web NaturoDesk face aux plateformes tierces génériques.",
  },
  {
    slug: "etude-canaux-acquisition-naturopathes-2026",
    cluster: "ACQUISITION_CLIENTELE",
    persona: "CROISSANCE",
    contentType: "PREUVE",
    keyword: "canaux d'acquisition des naturopathes en 2026",
    secondaryKeywords: ["étude naturopathes marketing", "statistiques acquisition clients naturopathie"],
    priority: 500,
    pillarSlug: ACQUISITION_PILLAR,
    naturodeskContext: "Présente des estimations chiffrées et cite NaturoDesk comme source d'observation (usage agrégé et anonymisé des fonctionnalités d'acquisition).",
  },

  // ── COMMUNICATION_VISIBILITE (20%) ──────────────────────────────────────────
  {
    slug: COMMUNICATION_PILLAR,
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "comment se faire connaître comme naturopathe",
    secondaryKeywords: ["visibilité naturopathe", "communication cabinet de naturopathie"],
    priority: 13,
    relatedSlugs: [
      "referencement-local-naturopathe-guide",
      "reseaux-sociaux-pour-naturopathe-lesquels-choisir",
      "creer-site-internet-naturopathe",
    ],
    naturodeskContext: "Présente la page professionnelle NaturoDesk comme socle de visibilité en ligne, complémentaire aux réseaux sociaux.",
  },
  {
    slug: "referencement-local-naturopathe-guide",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "référencement local naturopathe",
    secondaryKeywords: ["SEO local naturopathie", "être visible sur Google en tant que naturopathe"],
    priority: 160,
    pillarSlug: COMMUNICATION_PILLAR,
    relatedSlugs: [COMMUNICATION_PILLAR, "optimiser-sa-fiche-google-my-business-naturopathe"],
    naturodeskContext: "Mentionne que la page web publique NaturoDesk est pensée pour être bien référencée localement dès sa publication.",
  },
  {
    slug: "reseaux-sociaux-pour-naturopathe-lesquels-choisir",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "TUTORIEL",
    keyword: "réseaux sociaux pour naturopathe",
    secondaryKeywords: ["Instagram naturopathe", "communication réseaux sociaux naturopathie"],
    priority: 170,
    pillarSlug: COMMUNICATION_PILLAR,
    relatedSlugs: [COMMUNICATION_PILLAR, "contenu-instagram-naturopathe-idees"],
    naturodeskContext: "Suggère de renvoyer systématiquement le lien de la page NaturoDesk depuis les bios de réseaux sociaux.",
  },
  {
    slug: "creer-site-internet-naturopathe",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "créer un site internet naturopathe",
    secondaryKeywords: ["site web cabinet naturopathie", "page professionnelle naturopathe"],
    priority: 180,
    pillarSlug: COMMUNICATION_PILLAR,
    relatedSlugs: [COMMUNICATION_PILLAR],
    naturodeskContext: "Présente en détail la page web professionnelle générée automatiquement par NaturoDesk, sans compétence technique requise.",
  },
  {
    slug: "optimiser-sa-fiche-google-my-business-naturopathe",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "TUTORIEL",
    keyword: "fiche Google My Business naturopathe",
    secondaryKeywords: ["Google Profil d'entreprise naturopathe", "avis Google naturopathe"],
    priority: 190,
    pillarSlug: COMMUNICATION_PILLAR,
    naturodeskContext: "Suggère de faire correspondre les horaires affichés sur la fiche Google avec les disponibilités réelles gérées dans NaturoDesk.",
  },
  {
    slug: "contenu-instagram-naturopathe-idees",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "idées de contenu Instagram naturopathe",
    secondaryKeywords: ["publications réseaux sociaux naturopathie", "calendrier éditorial naturopathe"],
    priority: 200,
    pillarSlug: COMMUNICATION_PILLAR,
    naturodeskContext: "Reste factuel : mentionne NaturoDesk seulement comme exemple d'outil en arrière-plan, jamais comme sujet du contenu social lui-même.",
  },
  {
    slug: "newsletter-vs-reseaux-sociaux-naturopathe",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "COMPARATIF",
    keyword: "newsletter ou réseaux sociaux naturopathe",
    secondaryKeywords: ["email marketing naturopathie", "communication patientèle naturopathe"],
    priority: 210,
    pillarSlug: COMMUNICATION_PILLAR,
    naturodeskContext: "Évoque la base de contacts patients déjà présente dans NaturoDesk comme point de départ naturel pour une newsletter.",
  },
  {
    slug: "benchmark-visibilite-en-ligne-cabinets-naturopathie",
    cluster: "COMMUNICATION_VISIBILITE",
    persona: "LES_DEUX",
    contentType: "PREUVE",
    keyword: "visibilité en ligne des cabinets de naturopathie",
    secondaryKeywords: ["étude présence web naturopathes", "benchmark sites naturopathie"],
    priority: 510,
    pillarSlug: COMMUNICATION_PILLAR,
    naturodeskContext: "Présente des observations chiffrées et positionne NaturoDesk comme facilitateur de mise en ligne rapide d'une page professionnelle.",
  },

  // ── GESTION_OUTILS (20%) ─────────────────────────────────────────────────────
  {
    slug: GESTION_PILLAR,
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "COMPARATIF",
    keyword: "quels outils de gestion pour un naturopathe",
    secondaryKeywords: ["logiciel naturopathe", "meilleur logiciel de gestion cabinet naturopathie"],
    priority: 11,
    relatedSlugs: [
      "agenda-facturation-dossiers-patients-centraliser-sa-gestion",
      "comment-digitaliser-son-cabinet-de-naturopathie",
      "logiciel-facturation-naturopathe-comparatif",
    ],
    naturodeskContext: "C'est le sujet le plus naturellement lié à NaturoDesk : présente ses fonctionnalités clés (agenda, dossiers, facturation, page web) de façon factuelle, sans survendre.",
  },
  {
    slug: "agenda-facturation-dossiers-patients-centraliser-sa-gestion",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "centraliser sa gestion de cabinet de naturopathie",
    secondaryKeywords: ["tout-en-un naturopathe", "gestion administrative naturopathe"],
    priority: 220,
    pillarSlug: GESTION_PILLAR,
    relatedSlugs: [GESTION_PILLAR],
    naturodeskContext: "Décrit comment NaturoDesk réunit agenda, facturation et dossiers patients dans un seul espace de travail.",
  },
  {
    slug: "comment-digitaliser-son-cabinet-de-naturopathie",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "TUTORIEL",
    keyword: "digitaliser son cabinet de naturopathie",
    secondaryKeywords: ["passer au numérique naturopathe", "quitter le papier naturopathie"],
    priority: 230,
    pillarSlug: GESTION_PILLAR,
    relatedSlugs: [GESTION_PILLAR],
    naturodeskContext: "Décrit la migration progressive du papier vers NaturoDesk, étape par étape, sans rupture pour la patientèle.",
  },
  {
    slug: "gestion-des-rendez-vous-naturopathe-bonnes-pratiques",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "gestion des rendez-vous naturopathe",
    secondaryKeywords: ["agenda naturopathe", "réduire les rendez-vous manqués naturopathie"],
    priority: 240,
    pillarSlug: GESTION_PILLAR,
    naturodeskContext: "Présente les rappels automatiques d'agenda NaturoDesk comme réponse concrète aux rendez-vous manqués.",
  },
  {
    slug: "logiciel-facturation-naturopathe-comparatif",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "COMPARATIF",
    keyword: "logiciel de facturation naturopathe",
    secondaryKeywords: ["facturation naturopathie", "devis facture naturopathe"],
    priority: 250,
    pillarSlug: GESTION_PILLAR,
    relatedSlugs: [GESTION_PILLAR],
    naturodeskContext: "Compare les approches (tableur, logiciel comptable généraliste, solution métier comme NaturoDesk) sur des critères factuels.",
  },
  {
    slug: "dossier-patient-naturopathe-que-doit-il-contenir",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "GUIDE",
    keyword: "dossier patient naturopathe",
    secondaryKeywords: ["fiche patient naturopathie", "suivi dossier client naturopathe"],
    priority: 260,
    pillarSlug: GESTION_PILLAR,
    naturodeskContext: "Décrit la structure d'un dossier patient NaturoDesk (historique, notes, protocoles) sans jamais évoquer de diagnostic médical.",
  },
  {
    slug: "gagner-du-temps-administratif-naturopathe",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "TUTORIEL",
    keyword: "gagner du temps administratif naturopathe",
    secondaryKeywords: ["automatiser les tâches administratives naturopathie", "productivité cabinet naturopathe"],
    priority: 270,
    pillarSlug: GESTION_PILLAR,
    naturodeskContext: "Chiffre le temps gagné (estimation) grâce à l'automatisation des tâches répétitives dans NaturoDesk (facturation, rappels).",
  },
  {
    slug: "benchmark-outils-de-gestion-naturopathie-2026",
    cluster: "GESTION_OUTILS",
    persona: "LES_DEUX",
    contentType: "PREUVE",
    keyword: "outils de gestion des naturopathes en 2026",
    secondaryKeywords: ["étude logiciels naturopathie", "adoption outils numériques naturopathes"],
    priority: 520,
    pillarSlug: GESTION_PILLAR,
    naturodeskContext: "Présente des estimations chiffrées sur l'adoption d'outils numériques par les naturopathes, en citant NaturoDesk comme acteur du secteur.",
  },

  // ── DEVELOPPEMENT_ACTIVITE (15%) ────────────────────────────────────────────
  {
    slug: DEVELOPPEMENT_PILLAR,
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "comment fixer ses tarifs de consultation en naturopathie",
    secondaryKeywords: ["prix consultation naturopathe", "grille tarifaire naturopathie"],
    priority: 14,
    relatedSlugs: ["diversifier-son-activite-de-naturopathe", "proposer-des-ateliers-collectifs-en-naturopathie"],
    naturodeskContext: "Mentionne que la facturation NaturoDesk s'adapte facilement à une grille tarifaire évolutive (bilan, suivi, forfaits).",
  },
  {
    slug: "diversifier-son-activite-de-naturopathe",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "diversifier son activité de naturopathe",
    secondaryKeywords: ["revenus complémentaires naturopathe", "développer son cabinet"],
    priority: 280,
    pillarSlug: DEVELOPPEMENT_PILLAR,
    relatedSlugs: [DEVELOPPEMENT_PILLAR],
    naturodeskContext: "Montre comment NaturoDesk gère plusieurs types de prestations (bilan, suivi, ateliers) sans complexifier l'administratif.",
  },
  {
    slug: "proposer-des-ateliers-collectifs-en-naturopathie",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "TUTORIEL",
    keyword: "ateliers collectifs en naturopathie",
    secondaryKeywords: ["animer un atelier bien-être", "naturopathie en groupe"],
    priority: 290,
    pillarSlug: DEVELOPPEMENT_PILLAR,
    naturodeskContext: "Évoque la gestion d'agenda NaturoDesk pour organiser des créneaux collectifs en plus des consultations individuelles.",
  },
  {
    slug: "fideliser-sa-patientele-les-bonnes-pratiques",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "GUIDE",
    keyword: "fidéliser sa patientèle naturopathe bonnes pratiques",
    secondaryKeywords: ["suivi long terme naturopathie", "relation patient naturopathe"],
    priority: 300,
    pillarSlug: DEVELOPPEMENT_PILLAR,
    relatedSlugs: ["comment-fideliser-sa-patientele-naturopathie"],
    naturodeskContext: "Différencie cet angle développement (rétention, valeur vie client) de l'angle acquisition déjà traité ailleurs, tout en reliant les deux à NaturoDesk.",
  },
  {
    slug: "consultation-presentiel-vs-visio-naturopathe",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "COMPARATIF",
    keyword: "consultation en présentiel ou en visio naturopathe",
    secondaryKeywords: ["téléconsultation naturopathie", "naturopathe à distance"],
    priority: 310,
    pillarSlug: DEVELOPPEMENT_PILLAR,
    naturodeskContext: "Reste neutre sur le choix, mentionne juste que l'agenda NaturoDesk gère les deux formats sans distinction technique.",
  },
  {
    slug: "benchmark-tarifs-naturopathes-2026",
    cluster: "DEVELOPPEMENT_ACTIVITE",
    persona: "CROISSANCE",
    contentType: "PREUVE",
    keyword: "tarifs des naturopathes en 2026",
    secondaryKeywords: ["prix moyen consultation naturopathie", "étude tarifaire naturopathes"],
    priority: 530,
    pillarSlug: DEVELOPPEMENT_PILLAR,
    naturodeskContext: "Présente des fourchettes tarifaires estimées par zone géographique/expérience, toujours formulées comme des estimations.",
  },
];

/** Vérifie que pillarSlug/relatedSlugs pointent vers des slugs réellement présents dans TOPICS (détecte les fautes de frappe). */
function validateCrossReferences(topics: SeedTopic[]): string[] {
  const knownSlugs = new Set(topics.map((t) => t.slug));
  const errors: string[] = [];
  for (const topic of topics) {
    if (topic.pillarSlug && !knownSlugs.has(topic.pillarSlug)) {
      errors.push(`"${topic.slug}": pillarSlug "${topic.pillarSlug}" introuvable dans TOPICS`);
    }
    for (const related of topic.relatedSlugs ?? []) {
      if (!knownSlugs.has(related)) {
        errors.push(`"${topic.slug}": relatedSlugs contient "${related}", introuvable dans TOPICS`);
      }
    }
  }
  return errors;
}

async function main() {
  const referenceErrors = validateCrossReferences(TOPICS);
  if (referenceErrors.length > 0) {
    console.error("Références croisées invalides détectées :");
    referenceErrors.forEach((e) => console.error(`  - ${e}`));
    throw new Error(`${referenceErrors.length} référence(s) invalide(s) — corriger TOPICS avant de seeder.`);
  }

  let created = 0;
  let skipped = 0;

  for (const topic of TOPICS) {
    const existing = await db.blogTopic.findUnique({ where: { slug: topic.slug }, select: { id: true } });
    if (existing) {
      skipped++;
      continue;
    }

    await db.blogTopic.create({
      data: {
        slug: topic.slug,
        cluster: topic.cluster,
        persona: topic.persona,
        contentType: topic.contentType,
        keyword: topic.keyword,
        secondaryKeywords: topic.secondaryKeywords,
        priority: topic.priority,
        pillarSlug: topic.pillarSlug ?? null,
        relatedSlugs: topic.relatedSlugs ?? [],
        naturodeskContext: topic.naturodeskContext,
        status: "PLANNED",
      },
    });
    created++;
  }

  const byCluster = await db.blogTopic.groupBy({ by: ["cluster"], _count: { _all: true } });

  console.log(`\n${created} sujet(s) créé(s), ${skipped} déjà présent(s) (ignoré(s)).`);
  console.log("\nRépartition actuelle par cluster :");
  for (const row of byCluster) {
    console.log(`  ${row.cluster}: ${row._count._all}`);
  }
}

main()
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
