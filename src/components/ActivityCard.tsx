"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Activity } from "@/types";

// Reusable Google-Maps-style location pin icon
export function MapsPin({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        fill="#EA4335"
      />
      <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
  );
}

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
        <div className="flex items-center gap-1 flex-shrink-0">
          {activity.maps_url && (
            <a
              href={activity.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open in Google Maps"
              className="p-0.5 rounded hover:bg-gray-100 transition-colors"
            >
              <MapsPin className="w-5 h-5" />
            </a>
          )}
          <button
            onClick={() => {
              if (confirm(`Delete "${activity.title}"?`)) {
                onDelete(activity.id);
              }
            }}
            className="text-gray-300 hover:text-red-400 text-xl leading-none"
            aria-label="Remove activity"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
