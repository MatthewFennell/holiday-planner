export type TransportType = "car" | "train" | "boat" | "plane" | "bus" | "other";
export type TransportDirection = "outbound" | "return";
export type TimeSlot = "morning" | "afternoon" | "evening";

export interface Holiday {
  id: string;
  destination: string;
  start_date: string; // ISO date string e.g. "2025-07-01"
  end_date: string;
  created_at: string;
}

export interface TransportDetail {
  id: string;
  holiday_id: string;
  direction: TransportDirection;
  transport_type: TransportType;
  departure_location: string | null;
  arrival_location: string | null;
  departure_time: string | null; // ISO datetime string
  arrival_time: string | null;
  notes: string | null;
  created_at: string;
}

export interface Activity {
  id: string;
  holiday_id: string;
  title: string;
  description: string | null;
  maps_url: string | null;
  day_index: number | null; // null = unassigned; 0 = first day of trip
  time_slot: TimeSlot | null;
  sort_order: number;
  created_at: string;
}

export interface Accommodation {
  id: string;
  holiday_id: string;
  start_day_index: number;
  end_day_index: number;
  location_name: string;
  url: string | null;
  created_at: string;
}

export interface PackingItem {
  id: string;
  holiday_id: string;
  name: string;
  packed: boolean;
  sort_order: number;
  created_at: string;
}

// Container IDs used by the drag-and-drop board
export type ContainerId = "unassigned" | `day-${number}-${TimeSlot}`;
