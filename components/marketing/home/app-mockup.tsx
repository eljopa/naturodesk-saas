import { cn } from "@/lib/utils";

/* ── Shared atoms ── */
function AppBar({ url }: { url: string }) {
  return (
    <div className="nd-app-bar">
      <div className="nd-app-dots">
        <span /><span /><span />
      </div>
      <div className="nd-app-url">{url}</div>
    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  const items = [
    { icon: GridIcon, label: "Tableau de bord" },
    { icon: CalIcon,  label: "Agenda" },
    { icon: UsersIcon, label: "Patients" },
    { icon: PulseIcon, label: "Bilans" },
    { icon: LeafIcon,  label: "Protocoles" },
    { icon: BillIcon,  label: "Facturation" },
    { icon: GlobeIcon, label: "Ma page pro" },
  ];
  return (
    <div className="nd-app-side">
      <div className="nd-app-brand">
        <span className="dot" />
        NaturoDesk
      </div>
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className={cn("nd-navitem", label === active && "active")}>
          <Icon />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Appt({ time, name, type, color, initials }: { time: string; name: string; type: string; color: string; initials: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "11px 13px", border: `1px solid var(--nd-line-soft)`, borderLeft: `3px solid ${color}`, borderRadius: 11, background: "#fff" }}>
      <div style={{ fontWeight: 800, color: "var(--nd-forest)", fontSize: 12.5, width: 44, flexShrink: 0 }}>{time}</div>
      <div className="nd-avatar" style={{ width: 30, height: 30, fontSize: 11 }}>{initials}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--nd-forest)" }}>{name}</div>
        <div style={{ fontSize: 11.5, color: "var(--nd-muted)" }}>{type}</div>
      </div>
      <span className="nd-chip nd-chip-sage">60 min</span>
    </div>
  );
}

function Ring({ score, size }: { score: number; size: number }) {
  const r = 50; const circ = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" style={{ width: size, height: size, flexShrink: 0 }}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--nd-sage-tint)" strokeWidth="12" />
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--nd-sage)" strokeWidth="12"
        strokeLinecap="round" strokeDasharray={String(circ)}
        strokeDashoffset={String(circ * (1 - score / 100))} transform="rotate(-90 60 60)" />
      <text x="60" y="57" textAnchor="middle" fontFamily="var(--font-playfair),Georgia,serif" fontSize="28" fill="var(--nd-forest)" fontWeight="600">{score}</text>
      <text x="60" y="74" textAnchor="middle" fontFamily="var(--font-mulish),system-ui,sans-serif" fontSize="10.5" fill="var(--nd-muted)" fontWeight="700">/ 100</text>
    </svg>
  );
}

function Bar({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ display: "grid", gap: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--nd-forest)" }}>{label}</span>
        <span style={{ fontSize: 11.5, color: "var(--nd-muted)", fontWeight: 700 }}>{val}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 99, background: "var(--nd-sage-tint)" }}>
        <div style={{ height: "100%", width: `${val}%`, borderRadius: 99, background: "linear-gradient(90deg,#AAB59F,#799664)" }} />
      </div>
    </div>
  );
}

/* ── Mockup variants ── */
function AgendaMockup() {
  return (
    <div className="nd-app">
      <AppBar url="naturodesk.com/agenda" />
      <div className="nd-app-body">
        <Sidebar active="Agenda" />
        <div className="nd-app-main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 19, color: "var(--nd-forest)", fontWeight: 500 }}>Agenda</div>
              <div style={{ fontSize: 12, color: "var(--nd-muted)", fontWeight: 600 }}>Semaine du 8 juin 2026</div>
            </div>
            <span className="nd-chip nd-chip-sand">5 rendez-vous</span>
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            <Appt time="09:00" name="Élise Fontaine" type="Première consultation" color="#799664" initials="EF" />
            <Appt time="10:30" name="Marc Lefèvre" type="Suivi · vitalité" color="#B5895F" initials="ML" />
            <Appt time="14:00" name="Inès Caron" type="Protocole digestion" color="#AAB59F" initials="IC" />
            <Appt time="16:00" name="Paul Mercier" type="Bilan complet" color="#DCC2B2" initials="PM" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FicheMockup() {
  return (
    <div className="nd-app">
      <AppBar url="naturodesk.com/patients/elise-f" />
      <div className="nd-app-body">
        <Sidebar active="Patients" />
        <div className="nd-app-main">
          <div style={{ display: "flex", gap: 13, alignItems: "center", marginBottom: 16 }}>
            <div className="nd-avatar" style={{ width: 48, height: 48, fontSize: 17 }}>EF</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 18, color: "var(--nd-forest)", fontWeight: 500 }}>Élise Fontaine</div>
              <div style={{ fontSize: 12, color: "var(--nd-muted)", fontWeight: 600 }}>34 ans · Patiente depuis mars 2026</div>
            </div>
            <span className="nd-chip nd-chip-sand">Suivi actif</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 114px", gap: 14, alignItems: "center", background: "var(--nd-sage-wash)", border: "1px solid var(--nd-sage-tint)", borderRadius: 13, padding: "14px 16px", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--nd-sage-deep)", marginBottom: 7 }}>Motif principal</div>
              <div style={{ fontSize: 13.5, color: "var(--nd-forest)", lineHeight: 1.5 }}>Fatigue chronique et troubles digestifs. Objectif : retrouver de l&apos;énergie et réguler le transit.</div>
            </div>
            <Ring score={72} size={104} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Protocole en cours", "Drainage hépatique · 6 sem."], ["Prochain RDV", "22 juin · 10:30"]].map(([label, val]) => (
              <div key={label} style={{ border: "1px solid var(--nd-line-soft)", borderRadius: 11, padding: "12px 13px" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--nd-taupe)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 13, color: "var(--nd-forest)", fontWeight: 600 }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageproMockup() {
  return (
    <div className="nd-app" style={{ maxWidth: 520 }}>
      <AppBar url="🌿 naturodesk.com/camille-renaud" />
      <div style={{ background: "var(--nd-cream)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 16, padding: "20px 20px 16px", alignItems: "center", background: "linear-gradient(180deg,var(--nd-sage-wash),#fff)" }}>
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg,var(--nd-sage-tint),var(--nd-sage-soft))", display: "grid", placeItems: "center", fontSize: 28, color: "var(--nd-sage-deep)", fontWeight: 700 }}>CR</div>
          <div>
            <div style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 22, color: "var(--nd-forest)", lineHeight: 1.15 }}>Camille Renaud</div>
            <div style={{ fontSize: 12.5, color: "var(--nd-muted)", fontWeight: 600, margin: "4px 0 10px" }}>Naturopathe certifiée · Lyon 6ᵉ</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Digestion", "Sommeil", "Stress"].map(t => <span key={t} className="nd-chip nd-chip-sage">{t}</span>)}
            </div>
          </div>
        </div>
        <div style={{ padding: "14px 20px", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 15, color: "var(--nd-forest)" }}>Prendre rendez-vous</div>
            <div style={{ color: "var(--nd-copper)", fontSize: 12 }}>★★★★★ <span style={{ color: "var(--nd-muted)", fontWeight: 700 }}>4,9</span></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {[["Première consultation", "60 min", "70 €"], ["Consultation de suivi", "45 min", "55 €"]].map(([name, dur, price]) => (
              <div key={name} style={{ border: "1px solid var(--nd-line)", borderRadius: 11, padding: "11px 13px", background: "#fff" }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, color: "var(--nd-forest)" }}>{name}</div>
                <div style={{ fontSize: 11.5, color: "var(--nd-muted)" }}>{dur}</div>
                <div style={{ fontFamily: "var(--font-playfair),Georgia,serif", fontSize: 17, color: "var(--nd-copper-deep)", marginTop: 5 }}>{price}</div>
              </div>
            ))}
          </div>
          <button style={{ background: "var(--nd-sage)", color: "#fff", border: "none", borderRadius: 99, padding: "11px", fontWeight: 800, fontSize: 13.5, cursor: "default" }}>
            Réserver un créneau
          </button>
        </div>
      </div>
    </div>
  );
}

function MoteurMockup() {
  const rows = [
    { name: "Contraceptifs oraux", sev: "Majeure", color: "#C26B5A", txt: "Peut réduire l'efficacité contraceptive." },
    { name: "Antidépresseurs (ISRS)", sev: "Majeure", color: "#C26B5A", txt: "Risque de syndrome sérotoninergique." },
    { name: "Anticoagulants", sev: "Modérée", color: "#C99A4E", txt: "Surveillance recommandée." },
  ];
  return (
    <div className="nd-app">
      <AppBar url="naturodesk.com/analyse" />
      <div className="nd-app-body">
        <Sidebar active="Protocoles" />
        <div className="nd-app-main">
          <div style={{ display: "flex", gap: 9, alignItems: "center", border: "1.5px solid var(--nd-sage)", borderRadius: 99, padding: "9px 15px", marginBottom: 14, color: "var(--nd-sage-deep)" }}>
            <SearchIcon />
            <span style={{ fontWeight: 600, color: "var(--nd-forest)", fontSize: 13 }}>Millepertuis (Hypericum perforatum)</span>
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 13 }}>
            <span className="nd-chip nd-chip-sage">Interactions</span>
            <span className="nd-chip nd-chip-line">Effets secondaires</span>
            <span className="nd-chip nd-chip-line">Précautions</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map(row => (
              <div key={row.name} style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: "11px 13px", border: "1px solid var(--nd-line-soft)", borderRadius: 11, background: "#fff" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: row.color, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "var(--nd-forest)" }}>{row.name}</span>
                    <span className="nd-chip" style={{ background: `${row.color}22`, color: row.color }}>{row.sev}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--nd-muted)", marginTop: 3 }}>{row.txt}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 12, fontSize: 11, color: "var(--nd-muted)", fontWeight: 600 }}>
            <ShieldIcon /><span>Sources officielles de santé · mise à jour 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type MockupType = "agenda" | "fiche" | "pagepro" | "moteur";

export function AppMockup({ type }: { type: MockupType }) {
  if (type === "agenda")  return <AgendaMockup />;
  if (type === "fiche")   return <FicheMockup />;
  if (type === "pagepro") return <PageproMockup />;
  return <MoteurMockup />;
}

/* ── Inline icons (avoid extra imports) ── */
const s = { width: 15, height: 15, stroke: "currentColor", fill: "none", strokeWidth: 2, flexShrink: 0 } as const;
function GridIcon()   { return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function CalIcon()    { return <svg viewBox="0 0 24 24" style={s}><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round"/></svg>; }
function UsersIcon()  { return <svg viewBox="0 0 24 24" style={s}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5M17 11a3 3 0 0 0 0-6" strokeLinecap="round"/></svg>; }
function PulseIcon()  { return <svg viewBox="0 0 24 24" style={s}><path d="M3 12h4l2-6 4 12 2-6h6" strokeLinecap="round"/></svg>; }
function LeafIcon()   { return <svg viewBox="0 0 24 24" style={s}><path d="M4 20c8 2 16-4 16-16C10 4 4 10 4 20Zm0 0 9-9" strokeLinecap="round"/></svg>; }
function BillIcon()   { return <svg viewBox="0 0 24 24" style={s}><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" strokeLinecap="round"/></svg>; }
function GlobeIcon()  { return <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18" strokeLinecap="round"/></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" style={{ ...s, width: 15, height: 15 }}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3" strokeLinecap="round"/></svg>; }
function ShieldIcon() { return <svg viewBox="0 0 24 24" style={{ ...s, width: 14, height: 14 }}><path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6l-8-3Z"/></svg>; }
