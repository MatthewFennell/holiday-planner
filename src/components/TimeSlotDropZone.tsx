"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Activity } from "@/types";
import type { ContainerId } from "@/types";
import { ActivityCard } from "./ActivityCard";

interface TimeSlotDropZoneProps {
  id: ContainerId;
  label: string;
  activities: Activity[];
  onDelete: (id: string) => void;
}

export function TimeSlotDropZone({ id, activities, onDelete }: TimeSlotDropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[52px] rounded-xl p-2 space-y-2 transition-colors ${
        isOver ? "bg-brand-50 ring-2 ring-brand-300" : "bg-gray-50"
      }`}
    >
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} onDelete={onDelete} />
      ))}
    </div>
  );
}
