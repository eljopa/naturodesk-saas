import {
  Users,
  CalendarClock,
  Stethoscope,
  FileText,
  type LucideIcon,
} from "lucide-react"

export type Stat = {
  label: string
  value: number
  icon: LucideIcon
  hint: string
}

export const stats: Stat[] = [
  { label: "Patients actifs", value: 47, icon: Users, hint: "+3 ce mois-ci" },
  { label: "Rendez-vous à venir", value: 8, icon: CalendarClock, hint: "Cette semaine" },
  { label: "Consultations en cours", value: 3, icon: Stethoscope, hint: "À finaliser" },
  { label: "Factures brouillon", value: 2, icon: FileText, hint: "À envoyer" },
]

export type Message = {
  id: string
  name: string
  email: string
  preview: string
  date: string
  initials: string
}

export const messages: Message[] = [
  {
    id: "1",
    name: "Camille Laurent",
    email: "camille.laurent@email.com",
    preview:
      "Bonjour Marie, je souhaiterais reprogrammer mon rendez-vous de la semaine prochaine si possible…",
    date: "Aujourd'hui, 09:24",
    initials: "CL",
  },
  {
    id: "2",
    name: "Thomas Mercier",
    email: "t.mercier@email.com",
    preview:
      "Merci beaucoup pour la fiche conseil, j'ai commencé le protocole et je voulais vous demander…",
    date: "Hier, 17:08",
    initials: "TM",
  },
]

export type Appointment = {
  id: string
  patient: string
  initials: string
  datetime: string
  type: "Bilan" | "Suivi"
  online: boolean
}

export const appointments: Appointment[] = [
  {
    id: "1",
    patient: "Sophie Dubois",
    initials: "SD",
    datetime: "Aujourd'hui · 10:30",
    type: "Bilan",
    online: false,
  },
  {
    id: "2",
    patient: "Lucas Bernard",
    initials: "LB",
    datetime: "Aujourd'hui · 14:00",
    type: "Suivi",
    online: true,
  },
  {
    id: "3",
    patient: "Emma Petit",
    initials: "EP",
    datetime: "Demain · 09:15",
    type: "Bilan",
    online: true,
  },
  {
    id: "4",
    patient: "Hugo Moreau",
    initials: "HM",
    datetime: "Demain · 16:45",
    type: "Suivi",
    online: false,
  },
]
