/**
 * Augmente AppConfig pour que next-intl infère les types depuis fr.json.
 * Toute clé inexistante dans fr.json sera une erreur TypeScript.
 */
import type fr from "../messages/fr.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof fr;
  }
}
