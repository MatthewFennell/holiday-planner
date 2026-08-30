"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { TransportDetail, TransportType, TransportDirection } from "@/types";
import { format, parseISO } from "date-fns";

const TRANSPORT_ICONS: Record<TransportType, string> = {
  plane: "✈️",
  train: "🚆",
  car: "🚗",
  boat: "⛴️",
  bus: "🚌",
  other: "🚀",
};

const TRANSPORT_OPTIONS: TransportType[] = ["plane", "train", "car", "boat", "bus", "other"];

interface MetadataTabProps {
  holidayId: string;
}

const EMPTY_FORM = {
  direction: "outbound" as TransportDirection,
  transport_type: "plane" as TransportType,
  departure_location: "",
  arrival_location: "",
  departure_time: "",
  arrival_time: "",
  notes: "",
};

export function MetadataTab({ holidayId }: MetadataTabProps) {
  const [transport, setTransport] = useState<TransportDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("transport_details")
        .select("*")
        .eq("holiday_id", holidayId)
        .order("direction")
        .order("departure_time");
      if (data) setTransport(data);
      setLoading(false);
    }
    load();
  }, [holidayId]);

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      holiday_id: holidayId,
      direction: form.direction,
      transport_type: form.transport_type,
      departure_location: form.departure_location || null,
      arrival_location: form.arrival_location || null,
      departure_time: form.departure_time || null,
      arrival_time: form.arrival_time || null,
      notes: form.notes || null,
    };
    const { data, error } = await supabase
      .from("transport_details")
      .insert(payload)
      .select()
      .single();
    if (!error && data) {
      setTransport((prev) => [...prev, data]);
    }
    setForm(EMPTY_FORM);
    setSaving(false);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    setTransport((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("transport_details").delete().eq("id", id);
  }

  const outbound = transport.filter((t) => t.direction === "outbound");
  const returnLeg = transport.filter((t) => t.direction === "return");

  return (
    <div className="overflow-y-auto h-full px-4 py-5 space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Travel Details</h2>
        <button
          onClick={() => setShowForm(true)}
          className="text-brand-600 text-sm font-medium hover:text-brand-700"
        >
          + Add Leg
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <TransportSection title="🛫 Outbound Journey" legs={outbound} onDelete={handleDelete} />
          <TransportSection title="🛬 Return Journey" legs={returnLeg} onDelete={handleDelete} />
          {transport.length === 0 && !showForm && (
            <p className="text-sm text-gray-400 text-center py-8">
              No travel details yet. Tap &quot;+ Add Leg&quot; to add your first journey.
            </p>
          )}
        </>
      )}

      {/* Add form modal */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setShowForm(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Add Travel Leg</h3>

            {/* Direction */}
            <div className="flex gap-2">
              {(["outbound", "return"] as TransportDirection[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setField("direction", d)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    form.direction === d
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {d === "outbound" ? "🛫 Outbound" : "🛬 Return"}
                </button>
              ))}
            </div>

            {/* Transport type */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Transport type</label>
              <div className="flex flex-wrap gap-2">
                {TRANSPORT_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setField("transport_type", t)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      form.transport_type === t
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {TRANSPORT_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* From / To */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">From</label>
                <input
                  type="text"
                  placeholder="e.g. London"
                  value={form.departure_location}
                  onChange={(e) => setField("departure_location", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">To</label>
                <input
                  type="text"
                  placeholder="e.g. Barcelona"
                  value={form.arrival_location}
                  onChange={(e) => setField("arrival_location", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Departure</label>
                <input
                  type="datetime-local"
                  value={form.departure_time}
                  onChange={(e) => setField("departure_time", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Arrival</label>
                <input
                  type="datetime-local"
                  value={form.arrival_time}
                  onChange={(e) => setField("arrival_time", e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Notes</label>
              <textarea
                placeholder="e.g. Flight BA123, seat 14A, Terminal 5…"
                value={form.notes}
                onChange={(e) => setField("notes", e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
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

function TransportSection({
  title,
  legs,
  onDelete,
}: {
  title: string;
  legs: TransportDetail[];
  onDelete: (id: string) => void;
}) {
  if (legs.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
      <div className="space-y-3">
        {legs.map((leg) => (
          <TransportCard key={leg.id} leg={leg} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function TransportCard({
  leg,
  onDelete,
}: {
  leg: TransportDetail;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{TRANSPORT_ICONS[leg.transport_type]}</span>
          <div>
            <p className="font-medium text-gray-900 text-sm">
              {leg.departure_location && leg.arrival_location
                ? `${leg.departure_location} → ${leg.arrival_location}`
                : leg.departure_location || leg.arrival_location || leg.transport_type}
            </p>
            {leg.departure_time && (
              <p className="text-xs text-gray-400 mt-0.5">
                {format(parseISO(leg.departure_time), "EEE d MMM, HH:mm")}
                {leg.arrival_time &&
                  ` → ${format(parseISO(leg.arrival_time), "HH:mm")}`}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(leg.id)}
          className="text-gray-300 hover:text-red-400 text-xl leading-none ml-2"
          aria-label="Remove"
        >
          ×
        </button>
      </div>
      {leg.notes && (
        <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">{leg.notes}</p>
      )}
    </div>
  );
}
