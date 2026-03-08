import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Eye, Users, Bell, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { PRIORITY_CONFIG } from "./LeadPriorityConfig";
import AgeTimer from "./AgeTimer";
import { isPast, formatIsraeliDateTimeShort } from "@/components/utils/timeUtils";
import { base44 } from "@/api/base44Client";

const DEFAULT_WHATSAPP_TEMPLATE = "אהלן {{lead_name}}, תודה שפנית אלינו 🙂 אשמח לעזור לך. אפשר לשאול במה מדובר?";

function cleanPhone(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("0")) p = "972" + p.slice(1);
  return p.length >= 7 ? p : null;
}

function buildWhatsAppUrl(phone, name, template) {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return null;
  const tmpl = template || DEFAULT_WHATSAPP_TEMPLATE;
  const leadName = name && name.trim() ? name.trim() : "אהלן";
  const message = tmpl.replace(/\{\{lead_name\}\}/g, leadName);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

const ClientList = ({ clients, isLoading, onView, onEdit, onDelete, whatsappTemplate }) => {
  const { userWorkStages } = useUserWorkStages();

  const workStageLabels = React.useMemo(() => (
    userWorkStages.reduce((acc, s) => { acc[s.id] = s.label; return acc; }, {})
  ), [userWorkStages]);

  const workStageColors = React.useMemo(() => (
    userWorkStages.reduce((acc, s) => { acc[s.id] = getWorkStageColorClass(s.color); return acc; }, {})
  ), [userWorkStages]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-3 bg-white/50 rounded-lg">
            <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-12 text-center rtl-text">
        <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 mb-1">לא נמצאו לידים</h3>
        <p className="text-slate-400 text-sm">נסה לשנות את הפילטרים או להוסיף ליד חדש</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rtl-text">
      {/* Table Header – Desktop */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">
        <div className="col-span-3">שם + דחיפות</div>
        <div className="col-span-2">טלפון</div>
        <div className="col-span-1">מקור</div>
        <div className="col-span-2">שלב מכירה</div>
        <div className="col-span-2">⏱ זמן מאז נקלט</div>
        <div className="col-span-1">פולואפ</div>
        <div className="col-span-1 text-center">פעולות</div>
      </div>

      <div className="divide-y divide-slate-100">
        <AnimatePresence>
          {clients.map((client, index) => {
            const priority = client.priority || "warm";
            const pCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.warm;
            const hasFollowup = client.next_followup_at;
            const followupOverdue = hasFollowup && isPast(client.next_followup_at);

            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.015 }}
                className={`cursor-pointer border-r-4 border-transparent transition-all duration-150 hover:shadow-md ${pCfg.row}`}
                style={{ borderRightColor: "transparent" }}
                onClick={() => onView(client)}
                onMouseEnter={e => { e.currentTarget.style.borderRightColor = pCfg.accentHex; }}
                onMouseLeave={e => { e.currentTarget.style.borderRightColor = "transparent"; }}
              >
                {/* Desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center">
                  {/* Name + Priority */}
                  <div className="col-span-3 flex items-center gap-2 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${pCfg.accent}`}>
                      <span className="text-white text-xs font-bold">{client.name?.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-sm">{client.name}</p>
                      <Badge className={`${pCfg.badge} border text-xs mt-0.5`}>{pCfg.label}</Badge>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="col-span-2">
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </div>

                  {/* Source */}
                  <div className="col-span-1">
                    <span className="text-xs text-slate-500 truncate block">
                      {client.source === "website_form" && client.form_name ? `טופס: ${client.form_name}` : (client.source || "—")}
                    </span>
                  </div>

                  {/* Work Stage */}
                  <div className="col-span-2">
                    {client.work_stage && workStageLabels[client.work_stage] ? (
                      <Badge className={`${workStageColors[client.work_stage]} border text-xs`}>
                        {workStageLabels[client.work_stage]}
                      </Badge>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Age Timer */}
                  <div className="col-span-2">
                    <AgeTimer client={client} compact={false} />
                  </div>

                  {/* Next Followup */}
                  <div className="col-span-1">
                    {hasFollowup ? (
                      <span className={`text-xs font-medium flex items-center gap-1 ${followupOverdue ? "text-red-600" : "text-orange-600"}`}>
                        <Bell className="w-3 h-3" />
                        {formatIsraeliDateTimeShort(client.next_followup_at)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex gap-1 justify-center" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onView(client); }} className="h-7 w-7 text-blue-600 hover:bg-blue-50">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onEdit(client); }} className="h-7 w-7 text-slate-500 hover:bg-slate-100">
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    {(() => {
                      const waUrl = buildWhatsAppUrl(client.phone, client.name, whatsappTemplate);
                      return (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!waUrl}
                          title={waUrl ? "שליחת וואטסאפ" : "אין מספר טלפון לליד"}
                          onClick={e => { e.stopPropagation(); window.open(waUrl, "_blank"); }}
                          className="h-7 w-7 text-green-600 hover:bg-green-50 disabled:opacity-30"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      );
                    })()}
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onDelete(client.id); }} className="h-7 w-7 text-red-500 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="md:hidden p-3 flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${pCfg.accent}`}>
                    <span className="text-white font-bold text-sm">{client.name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{client.name}</p>
                      <Badge className={`${pCfg.badge} border text-xs`}>{pCfg.label}</Badge>
                      <AgeTimer client={client} compact />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{client.phone || client.email}</p>
                    {client.work_stage && workStageLabels[client.work_stage] && (
                      <Badge className={`${workStageColors[client.work_stage]} border text-xs mt-1`}>
                        {workStageLabels[client.work_stage]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onView(client); }} className="h-7 w-7 text-blue-600"><Eye className="w-3.5 h-3.5" /></Button>
                    {(() => {
                      const waUrl = buildWhatsAppUrl(client.phone, client.name, whatsappTemplate);
                      return (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!waUrl}
                          title={waUrl ? "שליחת וואטסאפ" : "אין מספר טלפון לליד"}
                          onClick={e => { e.stopPropagation(); window.open(waUrl, "_blank"); }}
                          className="h-7 w-7 text-green-600 hover:bg-green-50 disabled:opacity-30"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      );
                    })()}
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onDelete(client.id); }} className="h-7 w-7 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ClientList;