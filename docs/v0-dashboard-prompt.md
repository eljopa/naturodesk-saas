# Prompt v0.dev — Dashboard Home NaturoDesk

---

Design a home dashboard for **NaturoDesk**, a SaaS app for naturopaths. React + Tailwind CSS.

**Layout:** fixed sidebar + sticky topbar + scrollable main area.

**Sidebar navigation:**
- Tableau de bord
- Section "Cabinet" : Patients, Rendez-vous, Factures
- Section "Clinique" : Consultations, Fiches conseil, Protocoles
- Section "Ressources" : Base de connaissances
- Section "Web" : Page web, Messages (unread badge: 2)
- Paramètres (bottom)

**Topbar:** language switcher FR/EN + user avatar with initials + name + dropdown.

**Main content:**

1. Greeting: "Bonjour, Marie" + today's date below
2. 4 KPI stat cards in a row: Patients actifs (47), Rendez-vous à venir (8), Consultations en cours (3), Factures brouillon (2)
3. Unread messages card — 2 messages with sender name, email, preview text, date
4. Upcoming appointments card — 4 appointments with patient name, date/time, appointment type badge (Bilan or Suivi), and an "En ligne" badge for online bookings
