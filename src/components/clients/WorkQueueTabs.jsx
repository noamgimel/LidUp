import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Plus, Bell, Users, CheckCircle } from "lucide-react";
import { isSlaBreached, isPast, SLA_MINUTES, getLeadReceivedAt } from "@/components/utils/timeUtils";

/**
 * @param {object} c - lead/client object
 * @param {number} [nowMs] - server-synced now (from useServerTime)
 */
export function classifyLead(c, nowMs) {
  const now = nowMs ?? Date.now();
  const lifecycle = c.lifecycle || "open";
  if (lifecycle !== "open") return "closed";

  const followupMs = c.next_followup_at ? new Date(c.next_followup_at).getTime() : null;

  // Overdue SLA: no first_response AND >SLA_MINUTES old (UTC, server-synced now)
  const isSlaOverdue = !c.first_response_at && isSlaBreached(getLeadReceivedAt(c), SLA_MINUTES, now);
  // Overdue followup
  const isFollowupOverdue = followupMs && followupMs <= now;

  if (isSlaOverdue || isFollowupOverdue) return "overdue";
  if (!c.first_response_at) return "new";
  if (followupMs && followupMs <= now + 86400000) return "followup"; // today or past
  return "active";
}

const TABS = [
  {
    key: "overdue",
    label: "חורגים SLA",
    icon: AlertTriangle,
    style: "bg-red-50 text-red-800 border-red-200 hover:bg-red-100",
    activeStyle: "bg-red-600 text-white border-red-600 shadow-lg",
    badgeStyle: "bg-red-100 text-red-800",
    activeBadgeStyle: "bg-white text-red-700"
  },
  {
    key: "new",
    label: "חדשים",
    icon: Plus,
    style: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100",
    activeStyle: "bg-blue-600 text-white border-blue-600 shadow-lg",
    badgeStyle: "bg-blue-100 text-blue-800",
    activeBadgeStyle: "bg-white text-blue-700"
  },
  {
    key: "followup",
    label: "פולואפ היום",
    icon: Bell,
    style: "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100",
    activeStyle: "bg-orange-500 text-white border-orange-500 shadow-lg",
    badgeStyle: "bg-orange-100 text-orange-800",
    activeBadgeStyle: "bg-white text-orange-700"
  },
  {
    key: "active",
    label: "פעילים",
    icon: Users,
    style: "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100",
    activeStyle: "bg-slate-700 text-white border-slate-700 shadow-lg",
    badgeStyle: "bg-slate-200 text-slate-700",
    activeBadgeStyle: "bg-white text-slate-700"
  },
  {
    key: "closed",
    label: "סגורים",
    icon: CheckCircle,
    style: "bg-green-50 text-green-800 border-green-200 hover:bg-green-100",
    activeStyle: "bg-green-600 text-white border-green-600 shadow-lg",
    badgeStyle: "bg-green-100 text-green-800",
    activeBadgeStyle: "bg-white text-green-700"
  }
];

export default function WorkQueueTabs({ activeTab, onTabChange, counts }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {TABS.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-all duration-200 ${isActive ? tab.activeStyle : tab.style}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? tab.activeBadgeStyle : tab.badgeStyle}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}