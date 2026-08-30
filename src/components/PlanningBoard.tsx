"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { useState, useCallback, useRef, useEffect } from "react";
import type { Activity, ContainerId, TimeSlot } from "@/types";
import { supabase } from "@/lib/supabase";
import { ActivityCard } from "./ActivityCard";
import { TimeSlotDropZone } from "./TimeSlotDropZone";
import { eachDayOfInterval, parseISO, format } from "date-fns";

const TIME_SLOTS: TimeSlot[] = ["morning", "afternoon", "evening"];

const SLOT_META: Record<TimeSlot, { label: string; icon: string; bg: string; border: string }> = {
  morning:   { label: "Morning",   icon: "🌅", bg: "bg-amber-50",  border: "border-amber-100" },
  afternoon: { label: "Afternoon", icon: "☀️",  bg: "bg-sky-50",   border: "border-sky-100" },
  evening:   { label: "Evening",   icon: "🌙", bg: "bg-indigo-50", border: "border-indigo-100" },
};

function getContainerId(activity: Activity): ContainerId {
  if (activity.day_index === null || activity.time_slot === null) return "unassigned";
  return `day-${activity.day_index}-${activity.time_slot}`;
}

function parseContainerId(id: ContainerId): { dayIndex: number | null; slot: TimeSlot | null } {
  if (id === "unassigned") return { dayIndex: null, slot: null };
  const parts = id.split("-");
  return { dayIndex: Number(parts[1]), slot: parts[2] as TimeSlot };
}

interface PlanningBoardProps {
  holidayId: string;
  startDate: string;
  endDate: string;
  initialActivities: Activity[];
}

export function PlanningBoard({
  holidayId,
  startDate,
  endDate,
  initialActivities,
}: PlanningBoardProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [poolExpanded, setPoolExpanded] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const daySectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  // Highlight the day pill matching the section currently scrolled into view
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top <= b.boundingClientRect.top ? a : b
        );
        const idx = Number(topmost.target.getAttribute("data-day-index"));
        if (!isNaN(idx)) setActiveDayIndex(idx);
      },
      { threshold: 0.25, root: container }
    );

    daySectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [days.length]);

  function scrollToDay(index: number) {
    daySectionRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const getItemsForContainer = useCallback(
    (containerId: ContainerId) =>
      activities
        .filter((a) => getContainerId(a) === containerId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [activities]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const act = activities.find((a) => a.id === event.active.id);
    setActiveActivity(act ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const sourceAct = activities.find((a) => a.id === active.id);
    if (!sourceAct) return;

    let destContainerId: ContainerId;
    const overActivity = activities.find((a) => a.id === over.id);
    if (overActivity) {
      destContainerId = getContainerId(overActivity);
    } else {
      destContainerId = over.id as ContainerId;
    }

    const sourceContainerId = getContainerId(sourceAct);
    if (sourceContainerId === destContainerId) return;

    setActivities((prev) => {
      const { dayIndex, slot } = parseContainerId(destContainerId);
      return prev.map((a) =>
        a.id === active.id ? { ...a, day_index: dayIndex, time_slot: slot } : a
      );
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveActivity(null);

    if (!over) return;

    const sourceAct = activities.find((a) => a.id === active.id);
    if (!sourceAct) return;

    let destContainerId: ContainerId;
    const overActivity = activities.find((a) => a.id === over.id);
    if (overActivity) {
      destContainerId = getContainerId(overActivity);
    } else {
      destContainerId = over.id as ContainerId;
    }

    const sourceContainerId = getContainerId(sourceAct);

    if (sourceContainerId === destContainerId && active.id !== over.id && overActivity) {
      setActivities((prev) => {
        const containerItems = prev
          .filter((a) => getContainerId(a) === sourceContainerId)
          .sort((a, b) => a.sort_order - b.sort_order);
        const oldIdx = containerItems.findIndex((a) => a.id === active.id);
        const newIdx = containerItems.findIndex((a) => a.id === over.id);
        const reordered = arrayMove(containerItems, oldIdx, newIdx).map((a, i) => ({
          ...a,
          sort_order: i,
        }));
        const updated = prev.map((a) => reordered.find((r) => r.id === a.id) ?? a);
        reordered.forEach(({ id, sort_order }) => {
          supabase.from("activities").update({ sort_order }).eq("id", id);
        });
        return updated;
      });
      return;
    }

    const { dayIndex, slot } = parseContainerId(destContainerId);
    await supabase
      .from("activities")
      .update({ day_index: dayIndex, time_slot: slot })
      .eq("id", active.id);
  }

  async function handleAddActivity() {
    if (!newTitle.trim()) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("activities")
      .insert({
        holiday_id: holidayId,
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        day_index: null,
        time_slot: null,
        sort_order: activities.filter((a) => a.day_index === null).length,
      })
      .select()
      .single();
    if (!error && data) setActivities((prev) => [...prev, data]);
    setNewTitle("");
    setNewDesc("");
    setAdding(false);
    setShowAddModal(false);
  }

  async function handleDeleteActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("activities").delete().eq("id", id);
  }

  const unassigned = getItemsForContainer("unassigned");

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Ideas Pool ──────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2.5">
            <button
              onClick={() => setPoolExpanded((p) => !p)}
              className="flex items-center gap-2 text-sm font-semibold text-gray-700"
            >
               Ideas Pool
              {unassigned.length > 0 && (
                <span className="bg-brand-100 text-brand-800 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unassigned.length}
                </span>
              )}
              <span className="text-gray-400 text-xs">{poolExpanded ? "▲" : "▼"}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-brand-600 text-sm font-semibold hover:text-brand-700"
            >
              + Add Idea
            </button>
          </div>

          {poolExpanded && (
            <div className="px-4 pb-3 max-h-44 overflow-y-auto">
              <SortableContext
                items={unassigned.map((a) => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <TimeSlotDropZone
                  id="unassigned"
                  label=""
                  activities={unassigned}
                  onDelete={handleDeleteActivity}
                />
              </SortableContext>
              {unassigned.length === 0 && (
                <p className="text-xs text-gray-400 italic py-2 text-center">
                  Add ideas here, then drag them into a day below
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Day navigation pills ─────────────────────────────── */}
        <div className="bg-brand-900 flex-shrink-0 shadow-md">
          <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
            {days.map((day, i) => (
              <button
                key={i}
                onClick={() => scrollToDay(i)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeDayIndex === i
                    ? "bg-white text-brand-900 shadow"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-70">D{i + 1}</span>
                <span className="font-semibold">{format(day, "EEE d")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable day cards ──────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto bg-gray-100 px-4 py-4 space-y-5"
        >
          {days.map((day, dayIdx) => {
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

            return (
              <div
                key={dayIdx}
                ref={(el) => { daySectionRefs.current[dayIdx] = el; }}
                data-day-index={dayIdx}
                id={`day-section-${dayIdx}`}
                className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200"
              >
                {/* Day header */}
                <div className="bg-brand-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-sm font-medium">Day {dayIdx + 1}</span>
                    <span className="text-white/30">·</span>
                    <span className="text-white font-semibold text-sm">
                      {format(day, "EEEE, d MMMM")}
                    </span>
                  </div>
                  {isToday && (
                    <span className="bg-white/20 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Today
                    </span>
                  )}
                </div>

                {/* Time slot sections */}
                {TIME_SLOTS.map((slot, slotIdx) => {
                  const containerId: ContainerId = `day-${dayIdx}-${slot}`;
                  const slotItems = getItemsForContainer(containerId);
                  const { label, icon, bg, border } = SLOT_META[slot];

                  return (
                    <div
                      key={slot}
                      className={`${bg} px-4 py-3 ${slotIdx < TIME_SLOTS.length - 1 ? `border-b ${border}` : ""}`}
                    >
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                        {icon} {label}
                      </p>
                      <SortableContext
                        items={slotItems.map((a) => a.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <TimeSlotDropZone
                          id={containerId}
                          label={label}
                          activities={slotItems}
                          onDelete={handleDeleteActivity}
                        />
                      </SortableContext>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="h-6" />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeActivity ? (
          <ActivityCard activity={activeActivity} overlay onDelete={() => {}} />
        ) : null}
      </DragOverlay>

      {/* Add idea modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Add an Idea</h3>
            <input
              type="text"
              placeholder="Activity name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600"
              autoFocus
            />
            <textarea
              placeholder="Notes (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-3 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddActivity}
                disabled={adding || !newTitle.trim()}
                className="flex-1 bg-brand-700 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {adding ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
}
