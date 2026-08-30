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
import { useState, useCallback } from "react";
import type { Activity, ContainerId, TimeSlot } from "@/types";
import { supabase } from "@/lib/supabase";
import { ActivityCard } from "./ActivityCard";
import { TimeSlotDropZone } from "./TimeSlotDropZone";
import { eachDayOfInterval, parseISO, format } from "date-fns";

const TIME_SLOTS: TimeSlot[] = ["morning", "afternoon", "evening"];
const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening: "🌙 Evening",
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
  const [selectedDay, setSelectedDay] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  // Group activities by container
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

    // Determine destination container
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

    // Handle reordering within the same container
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
        // Persist sort order
        reordered.forEach(({ id, sort_order }) => {
          supabase.from("activities").update({ sort_order }).eq("id", id);
        });
        return updated;
      });
      return;
    }

    // Persist move to new container
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
    if (!error && data) {
      setActivities((prev) => [...prev, data]);
    }
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
      <div className="flex flex-col h-full">
        {/* Unassigned pool */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Ideas Pool
            </h3>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-brand-600 text-sm font-medium hover:text-brand-700"
            >
              + Add Idea
            </button>
          </div>

          <SortableContext
            items={unassigned.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <TimeSlotDropZone id="unassigned" label="" activities={unassigned} onDelete={handleDeleteActivity} />
          </SortableContext>

          {unassigned.length === 0 && (
            <p className="text-xs text-gray-400 italic py-1">
              Add ideas here, then drag them into your days below
            </p>
          )}
        </div>

        {/* Day tabs */}
        <div className="bg-white border-b border-gray-200 flex overflow-x-auto no-scrollbar">
          {days.map((day, i) => (
            <button
              key={i}
              onClick={() => setSelectedDay(i)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedDay === i
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="block text-xs text-gray-400">Day {i + 1}</span>
              {format(day, "EEE d")}
            </button>
          ))}
        </div>

        {/* Day planning area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {TIME_SLOTS.map((slot) => {
            const containerId: ContainerId = `day-${selectedDay}-${slot}`;
            const slotItems = getItemsForContainer(containerId);
            return (
              <div key={slot}>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">{SLOT_LABELS[slot]}</h4>
                <SortableContext
                  items={slotItems.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TimeSlotDropZone
                    id={containerId}
                    label={SLOT_LABELS[slot]}
                    activities={slotItems}
                    onDelete={handleDeleteActivity}
                  />
                </SortableContext>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeActivity ? (
          <ActivityCard activity={activeActivity} overlay onDelete={() => {}} />
        ) : null}
      </DragOverlay>

      {/* Add activity modal */}
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
            <textarea
              placeholder="Notes (optional)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
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
                className="flex-1 bg-brand-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
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
