/**
 * Mappe chaque BlogCluster vers sa clé de traduction dans
 * messages/{fr,en}.json:marketing.blog.categories. Utilisé par la page liste
 * (filtre) et la page article (badge de catégorie).
 */

import type { BlogCluster } from "@prisma/client";

export const CLUSTER_MESSAGE_KEY: Record<BlogCluster, string> = {
  INSTALLATION: "installation",
  REGLEMENTATION_JURIDIQUE: "reglementationJuridique",
  ACQUISITION_CLIENTELE: "acquisitionClientele",
  COMMUNICATION_VISIBILITE: "communicationVisibilite",
  GESTION_OUTILS: "gestionOutils",
  DEVELOPPEMENT_ACTIVITE: "developpementActivite",
};

export const ALL_BLOG_CLUSTERS: BlogCluster[] = [
  "INSTALLATION",
  "REGLEMENTATION_JURIDIQUE",
  "ACQUISITION_CLIENTELE",
  "COMMUNICATION_VISIBILITE",
  "GESTION_OUTILS",
  "DEVELOPPEMENT_ACTIVITE",
];
