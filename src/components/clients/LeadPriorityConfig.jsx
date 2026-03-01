// Priority (urgency) config – single source of truth across the whole app

export const PRIORITY_CONFIG = {
  overdue: {
    label: "חורג SLA",
    badge: "bg-red-600 text-white border-red-600",
    row: "bg-red-50",
    accent: "bg-red-500",
    accentHex: "#ef4444",
    button: "bg-red-100 text-red-800 border-red-300 hover:bg-red-200",
    activeButton: "ring-2 ring-offset-1 ring-red-400 shadow-lg bg-red-200",
    badgeTab: "bg-red-200 text-red-900 border-transparent",
    activeBadgeTab: "bg-white text-red-800 border-red-500"
  },
  hot: {
    label: "חם 🔥",
    badge: "bg-orange-600 text-white border-orange-600",
    row: "bg-orange-50",
    accent: "bg-orange-500",
    accentHex: "#f97316",
    button: "bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200",
    activeButton: "ring-2 ring-offset-1 ring-orange-400 shadow-lg bg-orange-200",
    badgeTab: "bg-orange-200 text-orange-900 border-transparent",
    activeBadgeTab: "bg-white text-orange-800 border-orange-500"
  },
  warm: {
    label: "בינוני",
    badge: "bg-yellow-500 text-white border-yellow-500",
    row: "bg-amber-50",
    accent: "bg-yellow-500",
    accentHex: "#eab308",
    button: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200",
    activeButton: "ring-2 ring-offset-1 ring-yellow-400 shadow-lg bg-yellow-200",
    badgeTab: "bg-yellow-200 text-yellow-900 border-transparent",
    activeBadgeTab: "bg-white text-yellow-800 border-yellow-500"
  },
  cold: {
    label: "קר",
    badge: "bg-slate-500 text-white border-slate-500",
    row: "bg-slate-50",
    accent: "bg-slate-400",
    accentHex: "#94a3b8",
    button: "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200",
    activeButton: "ring-2 ring-offset-1 ring-slate-400 shadow-lg bg-slate-200",
    badgeTab: "bg-slate-200 text-slate-900 border-transparent",
    activeBadgeTab: "bg-white text-slate-800 border-slate-500"
  }
};

export const LIFECYCLE_CONFIG = {
  open: { label: "פעיל", badge: "bg-blue-100 text-blue-800 border-blue-200" },
  won:  { label: "נסגר ✅", badge: "bg-green-100 text-green-800 border-green-200" },
  lost: { label: "לא רלוונטי ❌", badge: "bg-gray-100 text-gray-600 border-gray-200" }
};

// Which work_stage IDs map to which lifecycle
export const STAGE_TO_LIFECYCLE = {
  closed_won: "won",
  closed_lost: "lost"
};