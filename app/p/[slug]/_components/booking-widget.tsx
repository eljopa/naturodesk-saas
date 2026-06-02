"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock, User, CheckCircle, ChevronLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number | null;
}

interface Slot {
  startAt: string; // ISO
  endAt: string;   // ISO
}

type Step = "service" | "date" | "slots" | "info" | "confirm";

interface BookingWidgetProps {
  slug: string;
  services: Service[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function maxDateIso() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// BookingWidget
// ---------------------------------------------------------------------------

export function BookingWidget({ slug, services }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>(services.length === 1 ? "date" : "service");
  const [selectedService, setSelectedService] = useState<Service | null>(
    services.length === 1 ? services[0] ?? null : null
  );
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Chargement des créneaux quand date ou service change
  useEffect(() => {
    if (!selectedDate || !selectedService) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);

    fetch(`/api/public/${slug}/slots?date=${selectedDate}&serviceId=${selectedService.id}`)
      .then((r) => r.json())
      .then((data: { slots: Slot[] }) => {
        setSlots(data.slots ?? []);
        setSlotsLoading(false);
        setStep("slots");
      })
      .catch(() => {
        setSlotsLoading(false);
        setSlots([]);
      });
  }, [selectedDate, selectedService, slug]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedService) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId:    selectedService.id,
          startAt:      selectedSlot.startAt,
          visitorName:  name.trim(),
          visitorEmail: email.trim(),
          visitorPhone: phone.trim() || undefined,
          honeypot:     "",
        }),
      });

      if (res.ok) {
        setSuccess(true);
      } else if (res.status === 409) {
        setErrorMsg("Ce créneau vient d'être pris. Veuillez en choisir un autre.");
        setStep("slots");
      } else if (res.status === 429) {
        setErrorMsg("Trop de tentatives. Veuillez réessayer dans une heure.");
      } else {
        setErrorMsg("Une erreur est survenue. Veuillez réessayer.");
      }
    } catch {
      setErrorMsg("Impossible de finaliser la réservation. Vérifiez votre connexion.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl bg-teal-50 border border-teal-200 p-6 text-center space-y-2">
        <CheckCircle className="w-10 h-10 text-teal-600 mx-auto" />
        <p className="text-teal-700 font-semibold text-lg">Réservation confirmée !</p>
        <p className="text-teal-600 text-sm">
          Un email de confirmation vous a été envoyé à <strong>{email}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {errorMsg}
        </p>
      )}

      {/* ── Étape 1 : Choisir une prestation ── */}
      {step === "service" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-600">Choisissez une prestation</p>
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelectedService(s); setStep("date"); }}
              className="w-full text-left rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 p-4 transition-colors"
            >
              <p className="font-medium text-slate-900">{s.name}</p>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{s.durationMinutes} min</span>
                {s.price !== null && <span>{s.price.toFixed(2).replace(".", ",")} €</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Étape 2 : Choisir une date ── */}
      {(step === "date" || step === "slots" || step === "info" || step === "confirm") && (
        <div className="space-y-3">
          {selectedService && services.length > 1 && (
            <button
              type="button"
              onClick={() => setStep("service")}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Changer de prestation
            </button>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Calendar className="w-4 h-4 text-teal-600" />
              {selectedService ? `${selectedService.name} — ` : ""}Choisissez une date
            </label>
            <input
              type="date"
              min={todayIso()}
              max={maxDateIso()}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setStep("date"); }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            />
          </div>
        </div>
      )}

      {/* ── Étape 3 : Choisir un créneau ── */}
      {(step === "slots" || step === "info" || step === "confirm") && (
        <div className="space-y-2">
          {slotsLoading ? (
            <p className="text-sm text-slate-400 animate-pulse">Chargement des créneaux…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun créneau disponible ce jour.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-700">Choisissez un horaire</p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.startAt}
                    type="button"
                    onClick={() => { setSelectedSlot(slot); setStep("info"); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selectedSlot?.startAt === slot.startAt
                        ? "bg-teal-700 text-white border-teal-700"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50"
                    }`}
                  >
                    {formatTime(slot.startAt)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Étape 4 : Informations visiteur ── */}
      {(step === "info" || step === "confirm") && selectedSlot && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <User className="w-4 h-4 text-teal-600" />
            Vos informations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="bw-name" className="text-xs text-slate-600">
                Nom complet <span className="text-red-500">*</span>
              </label>
              <input
                id="bw-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bw-email" className="text-xs text-slate-600">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="bw-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bw-phone" className="text-xs text-slate-600">
                Téléphone <span className="text-slate-400">(optionnel)</span>
              </label>
              <input
                id="bw-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          {/* Récapitulatif + bouton de confirmation */}
          {name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-1">
              <p className="text-sm font-medium text-slate-700 mb-2">Récapitulatif</p>
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Prestation</span>{" "}
                {selectedService?.name}
              </p>
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Date</span>{" "}
                {new Date(selectedSlot.startAt).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long",
                  timeZone: "Europe/Paris",
                })}
              </p>
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Heure</span>{" "}
                {formatTime(selectedSlot.startAt)} — {formatTime(selectedSlot.endAt)}
              </p>
              <p className="text-sm text-slate-600">
                <span className="text-slate-400">Patient</span>{" "}
                {name} · {email}
              </p>
              <button
                type="button"
                onClick={handleBook}
                disabled={submitting}
                className="mt-3 w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Réservation en cours…" : "Confirmer la réservation"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
