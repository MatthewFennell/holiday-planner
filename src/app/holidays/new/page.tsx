"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function NewHolidayPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!destination.trim()) {
      setError("Please enter a destination.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please enter both travel dates.");
      return;
    }
    if (endDate < startDate) {
      setError("Return date must be on or after the departure date.");
      return;
    }

    setLoading(true);
    const { data, error: dbError } = await supabase
      .from("holidays")
      .insert({ destination: destination.trim(), start_date: startDate, end_date: endDate })
      .select()
      .single();

    if (dbError || !data) {
      setError(dbError?.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/holidays/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-brand-600 text-white px-4 pt-12 pb-6 flex items-center gap-3">
        <Link href="/" className="text-white/80 hover:text-white text-2xl leading-none">‹</Link>
        <h1 className="text-xl font-bold">New Holiday</h1>
      </header>

      <main className="px-4 py-8 max-w-lg mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="destination">
              Where are you going?
            </label>
            <input
              id="destination"
              type="text"
              placeholder="e.g. Barcelona, Spain"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">
                Departure date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">
                Return date
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white font-semibold py-3 rounded-xl shadow hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create Holiday"}
          </button>
        </form>
      </main>
    </div>
  );
}
