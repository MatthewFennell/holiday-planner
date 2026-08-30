"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Accommodation } from "@/types";
import { MapsPin } from "./ActivityCard";
import { eachDayOfInterval, parseISO, format } from "date-fns";

// ── Safe date formatting ─────────────────────────────────────────────────────

function safeFormatDate(date: Date | null | undefined, pattern: string): string {
  if (!date || isNaN(date.getTime())) {
    return "Invalid date";
  }
  try {
    return format(date, pattern);
  } catch {
    return "Invalid date";
  }
}

// ── Link-type detection ──────────────────────────────────────────────────────

type LinkKind = "maps" | "airbnb" | "booking" | "other";

function detectLinkKind(url: string): LinkKind {
  const u = url.toLowerCase();
  if (u.includes("airbnb")) return "airbnb";
  if (u.includes("booking.com")) return "booking";
  if (u.includes("google") || u.includes("maps") || u.includes("goo.gl")) return "maps";
  return "other";
}

function LinkBadge({ url }: { url: string }) {
  const kind = detectLinkKind(url);
  const meta: Record<LinkKind, { label: string; bg: string; text: string }> = {
    maps:    { label: "Maps",        bg: "bg-red-50",   text: "text-red-600" },
    airbnb:  { label: "Airbnb",      bg: "bg-rose-50",  text: "text-rose-600" },
    booking: { label: "Booking.com", bg: "bg-blue-50",  text: "text-blue-700" },
    other:   { label: "Link",        bg: "bg-gray-100", text: "text-gray-600" },
  };
  const { label, bg, text } = meta[kind];
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${bg} ${text} hover:opacity-80 transition-opacity`}
    >
      {kind === "maps" ? (
        <MapsPin className="w-3.5 h-3.5" />
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {label}
    </a>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface AccommodationTabProps {
  holidayId: string;
  startDate: string;
  endDate: string;
}

interface FormState {
  startDayIndex: number;
  nights: number;
  locationName: string;
  url: string;
}

export function AccommodationTab({ holidayId, startDate, endDate }: AccommodationTabProps) {
  const [entries, setEntries] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ startDayIndex: 0, nights: 1, locationName: "", url: "" });
  const [saving, setSaving] = useState(false);

  // Safely parse dates, handling various formats
  const parseDateSafely = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isNaN(date.getTime())) {
        return new Date(dateStr);
      }
      return date;
    } catch {
      // If parseISO fails, try treating it as a date string directly
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        console.error(`Invalid date: ${dateStr}`);
        return new Date();
      }
      return d;
    }
  };

  const days = eachDayOfInterval({ start: parseDateSafely(startDate), end: parseDateSafely(endDate) });
  const lastDayIndex = days.length - 1;

  // Guard against invalid days array
  if (days.length === 0 || !days[0] || isNaN(days[0].getTime())) {
    return (
      <div className="overflow-y-auto h-full px-4 py-5 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-sm">Invalid date range for this holiday</p>
          <p className="text-xs mt-2 text-gray-400">Start: {startDate}, End: {endDate}</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("accommodation")
        .select("*")
        .eq("holiday_id", holidayId)
        .order("start_day_index");
      if (data) setEntries(data);
      setLoading(false);
    }
    load();
  }, [holidayId]);

  function openAdd(startDayIndex: number) {
    const nights = lastDayIndex - startDayIndex + 1;
    setEditingId(null);
    setForm({ startDayIndex, nights, locationName: "", url: "" });
    setShowModal(true);
  }

  function openEdit(entry: Accommodation) {
    setEditingId(entry.id);
    setForm({
      startDayIndex: entry.start_day_index,
      nights: entry.end_day_index - entry.start_day_index + 1,
      locationName: entry.location_name,
      url: entry.url ?? "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (!form.locationName.trim()) return;
    setSaving(true);

    const endDayIndex = Math.min(form.startDayIndex + form.nights - 1, lastDayIndex);
    const payload = {
      holiday_id: holidayId,
      start_day_index: form.startDayIndex,
      end_day_index: endDayIndex,
      location_name: form.locationName.trim(),
      url: form.url.trim() || null,
    };

    if (editingId) {
      const { data } = await supabase
        .from("accommodation")
        .update(payload)
        .eq("id", editingId)
        .select()
        .single();
      if (data)
        setEntries((prev) =>
          prev.map((e) => (e.id === editingId ? data : e)).sort((a, b) => a.start_day_index - b.start_day_index)
        );
    } else {
      const { data } = await supabase
        .from("accommodation")
        .insert(payload)
        .select()
        .single();
      if (data)
        setEntries((prev) =>
          [...prev, data].sort((a, b) => a.start_day_index - b.start_day_index)
        );
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("accommodation").delete().eq("id", id);
  }

  // Build display items: grouped cards for covered ranges, individual rows for gaps
  const displayItems: React.ReactNode[] = [];
  let i = 0;
  while (i < days.length) {
    const entry = entries.find((e) => e.start_day_index === i);
    if (entry) {
      const rangeNights = entry.end_day_index - entry.start_day_index;
      const rangeLabel =
        entry.start_day_index === entry.end_day_index
          ? `Day ${entry.start_day_index + 1} · ${safeFormatDate(days[entry.start_day_index], "EEE d MMM")}`
          : `Days ${entry.start_day_index + 1}–${entry.end_day_index + 1} · ${
              safeFormatDate(days[entry.start_day_index], "d MMM")
            } – ${safeFormatDate(days[entry.end_day_index], "d MMM")}  (${rangeNights} night${
              rangeNights !== 1 ? "s" : ""
            })`;

      displayItems.push(
        <div key={entry.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-brand-800 px-4 py-2.5 flex items-center justify-between gap-2">
            <span className="text-white/80 text-xs font-medium truncate">{rangeLabel}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => openEdit(entry)} className="text-white/60 hover:text-white text-xs underline">Edit</button>
              <button onClick={() => {
                if (confirm(`Delete "${entry.location_name}"?`)) {
                  handleDelete(entry.id);
                }
              }} className="text-white/40 hover:text-white text-lg leading-none" aria-label="Remove">×</button>
            </div>
          </div>
          {/* Location + link */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-sm font-semibold text-gray-900">{entry.location_name}</p>
            {entry.url && <div className="mt-1.5"><LinkBadge url={entry.url} /></div>}
          </div>
          {/* Day list inside the group */}
          <div className="px-4 pb-3 space-y-0.5">
            {Array.from({ length: entry.end_day_index - entry.start_day_index + 1 }, (_, k) => {
              const d = entry.start_day_index + k;
              return (
                <div key={d} className="flex items-center gap-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300 flex-shrink-0" />
                  <span className="text-xs text-gray-500">
                    Day {d + 1} · {safeFormatDate(days[d], "EEEE, d MMMM")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
      i = entry.end_day_index + 1;
    } else {
      displayItems.push(
        <div key={`gap-${i}`} className="bg-white rounded-xl border border-dashed border-gray-300 px-4 py-3 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Day {i + 1}</span>
            <span className="text-gray-600 text-sm ml-2">{safeFormatDate(days[i], "EEEE, d MMMM")}</span>
          </div>
          <button
            onClick={() => openAdd(i)}
            className="text-brand-600 text-sm font-semibold hover:text-brand-700 flex-shrink-0"
          >
            + Add
          </button>
        </div>
      );
      i++;
    }
  }

  // Preview of nights being set in the form
  const previewEnd = Math.min(form.startDayIndex + form.nights - 1, lastDayIndex);
  const maxNights = lastDayIndex - form.startDayIndex + 1;

  return (
    <div className="overflow-y-auto h-full px-4 py-5 max-w-lg mx-auto">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Accommodation</h2>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => <div key={n} className="bg-white rounded-2xl h-16 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">{displayItems}</div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={closeModal}>
          <div
            className="bg-white rounded-t-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? "Edit Accommodation" : "Add Accommodation"}
            </h3>

            {/* Starting day (read-only when adding from a specific day) */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Check-in day</label>
              <div className="border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 text-sm text-gray-700">
                <>Day {form.startDayIndex + 1} · {safeFormatDate(days[form.startDayIndex], "EEEE, d MMMM")}</>
              </div>
            </div>

            {/* Nights */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Number of nights
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setField("nights", Math.max(1, form.nights - 1))}
                  className="w-10 h-10 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center flex-shrink-0"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxNights}
                  value={form.nights}
                  onChange={(e) => setField("nights", Math.min(maxNights, Math.max(1, Number(e.target.value))))}
                  className="w-20 border border-gray-300 rounded-xl px-3 py-2.5 text-center text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                />
                <button
                  onClick={() => setField("nights", Math.min(maxNights, form.nights + 1))}
                  className="w-10 h-10 rounded-xl border border-gray-300 text-xl font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center flex-shrink-0"
                >
                  +
                </button>
              </div>
              <p className="text-xs text-brand-700 font-medium mt-2">
                {safeFormatDate(days[form.startDayIndex], "d MMM")}
                {previewEnd > form.startDayIndex && ` – ${safeFormatDate(days[previewEnd], "d MMM")}`}
                {" "}· Days {form.startDayIndex + 1}–{previewEnd + 1}
              </p>
            </div>

            {/* Location name */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Location name</label>
              <input
                type="text"
                placeholder="e.g. Hotel Marina, Airbnb Barceloneta…"
                value={form.locationName}
                onChange={(e) => setField("locationName", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                autoFocus
              />
            </div>

            {/* URL */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Link <span className="text-gray-400 font-normal">(Google Maps, Airbnb, Booking.com…)</span>
              </label>
              <input
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setField("url", e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              {form.url.trim() && (
                <div className="mt-2"><LinkBadge url={form.url} /></div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={closeModal} className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.locationName.trim()}
                className="flex-1 bg-brand-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
