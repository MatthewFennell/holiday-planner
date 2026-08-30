"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Accommodation } from "@/types";
import { MapsPin } from "./ActivityCard";
import { eachDayOfInterval, parseISO, format } from "date-fns";

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
    maps:    { label: "Maps",        bg: "bg-red-50",    text: "text-red-600" },
    airbnb:  { label: "Airbnb",      bg: "bg-rose-50",   text: "text-rose-600" },
    booking: { label: "Booking.com", bg: "bg-blue-50",   text: "text-blue-700" },
    other:   { label: "Link",        bg: "bg-gray-100",  text: "text-gray-600" },
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
      {kind === "maps" ? <MapsPin className="w-3.5 h-3.5" /> : (
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

const EMPTY_FORM = { locationName: "", url: "" };

export function AccommodationTab({ holidayId, startDate, endDate }: AccommodationTabProps) {
  const [entries, setEntries] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("accommodation")
        .select("*")
        .eq("holiday_id", holidayId)
        .order("day_index");
      if (data) setEntries(data);
      setLoading(false);
    }
    load();
  }, [holidayId]);

  function openForm(dayIndex: number) {
    const existing = entries.find((e) => e.day_index === dayIndex);
    setForm({
      locationName: existing?.location_name ?? "",
      url: existing?.url ?? "",
    });
    setEditingDayIndex(dayIndex);
  }

  function closeForm() {
    setEditingDayIndex(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.locationName.trim() || editingDayIndex === null) return;
    setSaving(true);

    const existing = entries.find((e) => e.day_index === editingDayIndex);
    const payload = {
      holiday_id: holidayId,
      day_index: editingDayIndex,
      location_name: form.locationName.trim(),
      url: form.url.trim() || null,
    };

    if (existing) {
      const { data } = await supabase
        .from("accommodation")
        .update({ location_name: payload.location_name, url: payload.url })
        .eq("id", existing.id)
        .select()
        .single();
      if (data) setEntries((prev) => prev.map((e) => (e.id === existing.id ? data : e)));
    } else {
      const { data } = await supabase
        .from("accommodation")
        .insert(payload)
        .select()
        .single();
      if (data) setEntries((prev) => [...prev, data]);
    }

    setSaving(false);
    closeForm();
  }

  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("accommodation").delete().eq("id", id);
  }

  if (loading) {
    return (
      <div className="overflow-y-auto h-full px-4 py-5 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full px-4 py-5 max-w-lg mx-auto">
      <h2 className="text-base font-semibold text-gray-800 mb-4">Accommodation by Day</h2>

      <div className="space-y-3">
        {days.map((day, dayIdx) => {
          const entry = entries.find((e) => e.day_index === dayIdx);

          return (
            <div
              key={dayIdx}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              {/* Day header */}
              <div className="bg-brand-800 px-4 py-2 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">
                  Day {dayIdx + 1} · {format(day, "EEE d MMM")}
                </span>
                {entry ? (
                  <button
                    onClick={() => openForm(dayIdx)}
                    className="text-white/60 hover:text-white text-xs underline"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => openForm(dayIdx)}
                    className="text-white/70 hover:text-white text-xs font-medium"
                  >
                    + Add
                  </button>
                )}
              </div>

              {/* Content */}
              {entry ? (
                <div className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {entry.location_name}
                    </p>
                    {entry.url && (
                      <div className="mt-1.5">
                        <LinkBadge url={entry.url} />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0 mt-0.5"
                    aria-label="Remove accommodation"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3">
                  <p className="text-sm text-gray-400 italic">No accommodation set</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit / Add modal */}
      {editingDayIndex !== null && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={closeForm}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">
              {entries.find((e) => e.day_index === editingDayIndex)
                ? "Edit Accommodation"
                : "Add Accommodation"}{" "}
              <span className="text-gray-400 font-normal text-base">
                — Day {editingDayIndex + 1} ({format(days[editingDayIndex], "EEE d MMM")})
              </span>
            </h3>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Location name
              </label>
              <input
                type="text"
                placeholder="e.g. Airbnb in Barceloneta, Hotel Marina…"
                value={form.locationName}
                onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Link{" "}
                <span className="text-gray-400 font-normal">(Google Maps, Airbnb, Booking.com…)</span>
              </label>
              <input
                type="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              />
              {form.url.trim() && (
                <div className="mt-2">
                  <LinkBadge url={form.url} />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeForm}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl"
              >
                Cancel
              </button>
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
