"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity } from "@/types";

interface ActivityCardProps {
  activity: Activity;
  overlay?: boolean;
  onDelete: (id: string) => void;
}

export function ActivityCard({ activity, overlay, onDelete }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? {} : style}
      className={`bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex items-start gap-2 shadow-sm ${
        overlay ? "shadow-lg rotate-1 scale-105 ring-2 ring-brand-400" : ""
      }`}
    >
      {/* Drag handle */}
      <span
        {...(overlay ? {} : { ...attributes, ...listeners })}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing mt-0.5 flex-shrink-0 touch-none"
        aria-label="Drag handle"
      >
        ⠿
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-snug truncate">{activity.title}</p>
        {activity.description && (
          <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
            {activity.description}
          </p>
        )}
      </div>
      {!overlay && (
        <button
          onClick={() => onDelete(activity.id)}
          className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0"
          aria-label="Remove activity"
        >
          ×
        </button>
      )}
    </div>
  );
}
