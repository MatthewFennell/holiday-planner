"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Holiday, Activity } from "@/types";
import { PlanningBoard } from "@/components/PlanningBoard";
import { MetadataTab } from "@/components/MetadataTab";
import { format, parseISO, differenceInDays } from "date-fns";

type Tab = "plan" | "info";

export default function HolidayPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [holiday, setHoliday] = useState<Holiday | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("plan");

  useEffect(() => {
    async function load() {
      const [{ data: h }, { data: a }] = await Promise.all([
        supabase.from("holidays").select("*").eq("id", id).single(),
        supabase.from("activities").select("*").eq("holiday_id", id).order("sort_order"),
      ]);
      if (h) setHoliday(h);
      if (a) setActivities(a);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!holiday) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">Holiday not found.</p>
        <Link href="/" className="text-brand-600 underline text-sm">← Back home</Link>
      </div>
    );
  }

  const start = parseISO(holiday.start_date);
  const end = parseISO(holiday.end_date);
  const nights = differenceInDays(end, start);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-600 text-white px-4 pt-10 pb-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/" className="text-white/80 hover:text-white text-2xl leading-none">‹</Link>
          <div>
            <h1 className="text-xl font-bold leading-tight">{holiday.destination}</h1>
            <p className="text-brand-200 text-xs mt-0.5">
              {format(start, "d MMM")} – {format(end, "d MMM yyyy")} · {nights} {nights === 1 ? "night" : "nights"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(["plan", "info"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-brand-700"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {t === "plan" ? "📅 Plan" : "ℹ️ Info"}
            </button>
          ))}
        </div>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === "plan" ? (
          <PlanningBoard
            holidayId={id}
            startDate={holiday.start_date}
            endDate={holiday.end_date}
            initialActivities={activities}
          />
        ) : (
          <MetadataTab holidayId={id} />
        )}
      </div>
    </div>
  );
}
