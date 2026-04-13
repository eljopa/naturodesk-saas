# Export PDF — NaturoDesk

> Dernière mise à jour : 2026-04-03

---

## Vue d'ensemble

NaturoDesk génère des PDFs côté serveur via **pdf-lib** (bibliothèque JavaScript pure, sans dépendances natives). Trois types de documents sont supportés :

| Document | Route | Déclencheur |
|----------|-------|-------------|
| Facture | `GET /api/pdf/invoice/[id]` | Bouton dans `/invoices/[id]` |
| Résumé consultation | `GET /api/pdf/consultation/[id]` | Bouton dans `/consultations/[id]` |
| Fiche patient | `GET /api/pdf/patient/[id]` | Bouton dans `/patients/[id]` |

---

## Bibliothèque — pdf-lib

**Pourquoi pdf-lib :**
- Pure JavaScript/TypeScript — aucune dépendance native (no Puppeteer, no headless Chrome)
- Fonctionne dans les Route Handlers Node.js de Next.js
- API programmatique (coordonnées, polices, formes)
- Retourne `Uint8Array` → convertir via `Buffer.from()` pour `NextResponse`

```typescript
import { PDFDocument, StandardFonts, rgb, PageSizes } from "pdf-lib";

const doc = await PDFDocument.create();
const page = doc.addPage(PageSizes.A4);  // 595.28 × 841.89 points
const font = await doc.embedFont(StandardFonts.Helvetica);
const bold = await doc.embedFont(StandardFonts.HelveticaBold);

page.drawText("NaturoDesk", { x: 48, y: 800, size: 20, font: bold, color: rgb(0,0,0) });

const pdfBytes = await doc.save();  // Uint8Array
return new NextResponse(Buffer.from(pdfBytes), {
  headers: { "Content-Type": "application/pdf" }
});
```

---

## Design commun

**Palette** (cohérente avec l'UI de l'app) :

| Couleur | Valeur rgb() | Usage |
|---------|--------------|-------|
| TEAL | `rgb(0.059, 0.463, 0.431)` | En-tête, accents |
| SLATE_900 | `rgb(0.059, 0.086, 0.122)` | Texte principal |
| SLATE_600 | `rgb(0.278, 0.337, 0.416)` | Labels, métadonnées |
| SLATE_400 | `rgb(0.576, 0.635, 0.718)` | Texte léger, footer |
| SLATE_100 | `rgb(0.937, 0.949, 0.965)` | Fonds de sections, séparateurs |

**Structure commune :**
- En-tête teal avec "NaturoDesk", nom du cabinet, et titre du document
- Footer avec texte de bas de page et séparateur
- Marges : 48 points (~17mm)
- Format : A4 (595 × 842 points)

---

## PDF Facture — `lib/pdf/invoice.ts`

**Fonction :** `generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array>`

### Structure du document

```
┌─────────────────────────────────────────┐
│ HEADER TEAL                             │
│ NaturoDesk          FACTURE             │
│ Cabinet Dupont      FAC-2026-0001       │
├─────────────────────────────────────────┤
│ Date          : 3 avril 2026            │
│ Statut        : Émise                   │
│ Paiement      : Carte bancaire          │
│ Praticien     : Marie Dupont            │
│ Patient       : Martin Jean             │
├─────────────────────────────────────────┤
│ [HEADER TABLE]                          │
│ Désignation     Qté   P.U.     Total    │
│ ─────────────────────────────────────── │
│ Consultation    1     80,00 €  80,00 €  │
│ Bilan initia..  1    120,00 € 120,00 €  │
├─────────────────────────────────────────┤
│                 Total TTC  200,00 €     │
├─────────────────────────────────────────┤
│ FOOTER                                  │
└─────────────────────────────────────────┘
```

### Données requises (`InvoicePdfData`)

```typescript
interface InvoicePdfData {
  invoiceNumber: string;
  issuedAt: Date | null;
  practitionerName: string;
  cabinetName: string | null;
  patientFirstName: string;
  patientLastName: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  paymentMethod: string | null;
  totalAmount: number;
  lines: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  locale: "fr" | "en";
}
```

### Points techniques

- La description est tronquée à 50 caractères si trop longue
- Les montants sont formatés via `Intl.NumberFormat` (EUR)
- Le tableau des lignes a 4 colonnes : description (55%), qté (8%), PU (18%), total (19%)
- Aucune gestion multi-page (les factures avec beaucoup de lignes peuvent dépasser)

---

## PDF Consultation — `lib/pdf/consultation.ts`

**Fonction :** `generateConsultationPdf(data: ConsultationPdfData): Promise<Uint8Array>`

### Structure du document

Document multi-pages automatique — une nouvelle page est ajoutée si `y < 80` (espace insuffisant).

```
Page 1 :
├── Header teal
├── Patient + Date + Praticien + Type RDV
├── [Contexte général]
│   └── Texte avec word-wrap automatique
├── [Symptômes]
│   └── • symptôme (intensité/10) — durée [catégorie]
├── [Médicaments]
│   └── • nom — dosage — fréquence — durée
...
Page N (si dépassement) :
├── Header teal
└── Suite du contenu
```

### Données requises (`ConsultationPdfData`)

```typescript
interface ConsultationPdfData {
  practitionerName: string;
  cabinetName: string | null;
  patientFirstName: string;
  patientLastName: string;
  consultationDate: Date;
  context: string | null;
  appointmentType: string | null;
  symptoms: Array<{ label; intensity; duration; category }>;
  medications: Array<{ name; dosage; frequency; duration }>;
  supplements: Array<{ name; dosage; duration }>;
  findings: Array<{ category; title; description }>;
  locale: "fr" | "en";
}
```

### Points techniques

- Word-wrap manuel par découpe sur les espaces
- Chaque section a un titre avec fond `SLATE_100`
- Les observations (findings) affichent le titre en gras + catégorie + description
- Multi-pages : chaque page a son propre header/footer

---

## PDF Patient — `lib/pdf/patient.ts`

**Fonction :** `generatePatientPdf(data: PatientPdfData): Promise<Uint8Array>`

### Structure du document (1 page)

```
├── Header teal
├── Nom complet (grand titre teal)
├── [Identité]
│   ├── Date de naissance
│   └── Profession
├── [Coordonnées] (si données présentes)
│   ├── Téléphone
│   ├── Email
│   └── Adresse (multiline)
├── [Données cliniques] (si données présentes)
│   ├── Allergies / Intolérances
│   └── Antécédents médicaux
├── [Notes internes] (si présentes)
└── Footer
```

---

## Route Handlers

### Structure commune

```typescript
// app/api/pdf/[type]/[id]/route.ts
export async function GET(_req: NextRequest, { params }) {
  const [user, locale, { id }] = await Promise.all([requireUser(), getLocale(), params]);

  const record = await db.[model].findUnique({ where: { id }, include: {...} });
  if (!record || !ownsRecord(record, user.id)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const pdfBytes = await generate[Type]Pdf({ ...data, locale });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-cache",
    },
  });
}
```

### Vérification ownership

| PDF | Vérification |
|-----|-------------|
| Invoice | `invoice.userId === user.id` |
| Consultation | `consultation.patient.userId === user.id` |
| Patient | `patient.userId === user.id` |

### Nommage des fichiers

| Type | Nom |
|------|-----|
| Facture | `FAC-2026-0001.pdf` (numéro de facture) |
| Consultation | `consultation-Martin-a1b2c3d4.pdf` (nom patient + 8 chars ID) |
| Patient | `patient-martin.pdf` (nom en minuscules, tirets) |

---

## Boutons dans l'UI

Les boutons PDF utilisent des liens `<a>` standards (pas de Router Next.js) avec `asChild` sur le composant `Button` :

```tsx
<Button variant="secondary" size="sm" asChild>
  <a href={`/api/pdf/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer" download>
    <Download className="w-4 h-4 mr-1.5" />
    {tPdf("downloadInvoice")}
  </a>
</Button>
```

L'attribut `download` déclenche le téléchargement. `target="_blank"` permet aussi l'aperçu dans un nouvel onglet selon le navigateur.

---

## Localisation

Tous les PDFs sont bilingues via le paramètre `locale: "fr" | "en"` :
- Labels des sections (FR/EN)
- Format des dates (`fr-FR` / `en-GB` via `Intl.DateTimeFormat`)
- Format des montants (`fr-FR` / `en-GB` via `Intl.NumberFormat` EUR)
- La locale est lue depuis le cookie `NEXT_LOCALE` via `getLocale()` dans la route handler
