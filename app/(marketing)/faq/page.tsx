import { redirect } from "next/navigation";

// FAQ moved to /ressources/centre-aide
export default function FaqPage() {
  redirect("/ressources/centre-aide");
}
