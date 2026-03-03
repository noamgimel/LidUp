import React from "react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { AlertTriangle, Bell, UserPlus, ArrowLeft } from "lucide-react";
import { formatAgeText, formatIsraeliDateTimeShort } from "@/components/utils/timeUtils";

const formatAge = formatAgeText;
const formatFollowupTime = formatIsraeliDateTimeShort;

function LeadRow({ client }) {
  return (
    <Link
      to={`${createPageUrl("Clients")}?viewClientId=${client.id}`}
      className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group cursor-pointer"
    >
      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm flex-shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700">
        {client.name?.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{client.name}</p>
        <p className="text-xs text-slate-500 truncate">{client.phone || client.email || "—"}</p>
      </div>
      <div className="text-left flex-shrink-0">
        <p className="text-xs text-slate-400">{formatAge(client.created_date)}</p>
        {client.next_followup_at && (
          <p className="text-xs text-orange-600 font-medium">{formatFollowupTime(client.next_followup_at)}</p>
        )}
      </div>
      <ArrowLeft className="w-3 h-3 text-slate-300 group-hover:text-blue-400 flex-shrink-0" />
    </Link>
  );
}

const BLOCK_CONFIG = {
  overdue: {
    title: "חורגים SLA",
    subtitle: "דורשים טיפול מיידי",
    icon: AlertTriangle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    headerBg: "bg-red-50 border-red-200",
    badgeCls: "bg-red-600 text-white",
    emptyText: "אין חורגים — כל הכבוד! 🎉"
  },
  followup: {
    title: "פולואפים להיום",
    subtitle: "ממתינים לטיפול",
    icon: Bell,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    headerBg: "bg-orange-50 border-orange-200",
    badgeCls: "bg-orange-500 text-white",
    emptyText: "אין פולואפים להיום"
  },
  new_no_contact: {
    title: "חדשים ללא קשר",
    subtitle: "לא נוצר קשר ראשון",
    icon: UserPlus,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    headerBg: "bg-blue-50 border-blue-200",
    badgeCls: "bg-blue-600 text-white",
    emptyText: "כל הלידים קיבלו מגע ✓"
  }
};

export default function WorkBlockList({ type, clients, isLoading }) {
  const cfg = BLOCK_CONFIG[type];
  const Icon = cfg.icon;
  const shown = clients.slice(0, 5);

  return (
    <div className={`rounded-xl border ${cfg.headerBg} overflow-hidden`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${cfg.headerBg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 ${cfg.iconBg} rounded-lg flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">{cfg.title}</p>
            <p className="text-xs text-slate-500">{cfg.subtitle}</p>
          </div>
        </div>
        {clients.length > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badgeCls}`}>{clients.length}</span>
        )}
      </div>

      <div className="bg-white divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-4 text-center text-slate-400 text-sm">טוען...</div>
        ) : shown.length === 0 ? (
          <div className="p-4 text-center text-slate-400 text-sm">{cfg.emptyText}</div>
        ) : (
          <>
            {shown.map(c => <LeadRow key={c.id} client={c} />)}
            {clients.length > 5 && (
              <Link
                to={createPageUrl("Clients")}
                className="block text-center text-xs text-blue-600 hover:underline py-2.5 font-medium"
              >
                עוד {clients.length - 5} לידים...
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}