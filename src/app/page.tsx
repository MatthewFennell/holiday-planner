"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Holiday } from "@/types";
import { format, parseISO, differenceInDays } from "date-fns";

export default function HomePage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHolidays() {
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("start_date", { ascending: true });
      if (!error && data) setHolidays(data);
      setLoading(false);
    }
    fetchHolidays();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-brand-600 text-white px-4 pt-12 pb-6 shadow-md">
        <h1 className="text-2xl font-bold tracking-tight">✈️ Holiday Planner</h1>
        <p className="text-brand-200 text-sm mt-1">Plan every moment of your trip</p>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Your Holidays</h2>
          <Link
            href="/holidays/new"
            className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-full shadow hover:bg-brand-700 active:scale-95 transition-all"
          >
            + New Holiday
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🌍</div>
            <p className="font-medium text-gray-600">No holidays yet</p>
            <p className="text-sm mt-1">Tap &quot;New Holiday&quot; to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {holidays.map((holiday) => (
              <HolidayCard key={holiday.id} holiday={holiday} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function HolidayCard({ holiday }: { holiday: Holiday }) {
  const start = parseISO(holiday.start_date);
  const end = parseISO(holiday.end_date);
  const nights = differenceInDays(end, start);

  return (
    <Link href={`/holidays/${holiday.id}`}>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">{holiday.destination}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(start, "d MMM")} – {format(end, "d MMM yyyy")}
            </p>
          </div>
          <span className="bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1 rounded-full">
            {nights} {nights === 1 ? "night" : "nights"}
          </span>
        </div>
      </div>
    </Link>
  );
}
