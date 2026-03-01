import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Eye, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { PRIORITY_CONFIG, LIFECYCLE_CONFIG } from "./LeadPriorityConfig";

const ClientList = ({ clients, isLoading, onView, onEdit, onDelete }) => {
  const { userWorkStages } = useUserWorkStages();

  const workStageLabels = React.useMemo(() => {
    return userWorkStages.reduce((acc, stage) => {
      acc[stage.id] = stage.label;
      return acc;
    }, {});
  }, [userWorkStages]);

  const workStageColors = React.useMemo(() => {
    return userWorkStages.reduce((acc, stage) => {
      acc[stage.id] = getWorkStageColorClass(stage.color);
      return acc;
    }, {});
  }, [userWorkStages]);

  if (isLoading) {
    return (
      <div className="rounded-lg">
        <div className="hidden md:block p-6">
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-16" /></div>
                <div className="flex items-center gap-4">
                  <div><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:hidden p-4 space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse bg-white/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-3 w-32" /></div>
                </div>
                <Skeleton className="h-3 w-full mb-2" /><Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-8 md:p-12 text-center rtl-text">
        <Users className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="font-semibold text-slate-900 mb-2">לא נמצאו לידים</h3>
        <p className="text-slate-500">נסה לשנות את הפילטרים או להוסיף ליד חדש</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rtl-text">
      {/* Table Header - Desktop */}
      <div className="hidden md:block border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-12 gap-3 p-4 text-sm font-semibold text-slate-700 text-right">
          <div className="col-span-2">שם</div>
          <div className="col-span-2">חברה</div>
          <div className="col-span-2">אימייל</div>
          <div className="col-span-1">טלפון</div>
          <div className="col-span-1">מקור</div>
          <div className="col-span-1">דחיפות</div>
          <div className="col-span-2">שלב מכירה</div>
          <div className="col-span-1">פעולות</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-slate-200">
        <AnimatePresence>
          {clients.map((client, index) => {
            const priority = client.priority || 'warm';
            const pCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.warm;
            const lifecycle = client.lifecycle || 'open';
            const lCfg = LIFECYCLE_CONFIG[lifecycle];

            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className={`transition-all duration-200 cursor-pointer border-r-4 border-transparent ${pCfg.row} hover:shadow-lg`}
                onClick={() => onView(client)}
                onMouseEnter={(e) => { e.currentTarget.style.borderRightColor = pCfg.accentHex; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderRightColor = 'transparent'; }}
              >
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-3 p-4 items-center">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pCfg.accent}`}>
                        <span className="text-white text-xs font-bold">{client.name?.charAt(0)}</span>
                      </div>
                      <p className="font-medium text-slate-900 truncate">{client.name}</p>
                    </div>
                  </div>
                  <div className="col-span-2"><p className="text-slate-700 truncate">{client.company || '-'}</p></div>
                  <div className="col-span-2"><p className="text-slate-700 truncate">{client.email}</p></div>
                  <div className="col-span-1"><p className="text-slate-600 text-sm">{client.phone || '-'}</p></div>
                  <div className="col-span-1"><p className="text-slate-600 text-sm truncate">{client.source || '-'}</p></div>

                  {/* Priority badge */}
                  <div className="col-span-1">
                    <Badge className={`${pCfg.badge} border whitespace-nowrap text-xs`}>
                      {pCfg.label}
                    </Badge>
                  </div>

                  {/* Work stage */}
                  <div className="col-span-2">
                    {client.work_stage && workStageLabels[client.work_stage] ? (
                      <Badge className={`${workStageColors[client.work_stage]} border whitespace-nowrap text-xs`}>
                        {workStageLabels[client.work_stage]}
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-600 text-white border-gray-600 whitespace-nowrap text-xs">לא מוגדר</Badge>
                    )}
                    {lifecycle !== 'open' && (
                      <Badge className={`${lCfg.badge} border text-xs mt-1`}>{lCfg.label}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(client); }} className="h-8 w-8 text-blue-600 hover:bg-blue-50">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(client); }} className="h-8 w-8 text-slate-600 hover:bg-slate-100">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} className="h-8 w-8 text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile View */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pCfg.accent}`}>
                          <span className="text-white font-bold">{client.name?.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
                          <p className="text-sm text-slate-600 truncate">{client.company || client.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-1">
                        <Badge className={`${pCfg.badge} border text-xs`}>{pCfg.label}</Badge>
                        {client.work_stage && workStageLabels[client.work_stage] ? (
                          <Badge className={`${workStageColors[client.work_stage]} border text-xs`}>{workStageLabels[client.work_stage]}</Badge>
                        ) : (
                          <Badge className="bg-gray-600 text-white text-xs">לא מוגדר</Badge>
                        )}
                        {lifecycle !== 'open' && (
                          <Badge className={`${lCfg.badge} border text-xs`}>{lCfg.label}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(client); }} className="h-8 w-8 text-blue-600 hover:bg-blue-50"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(client); }} className="h-8 w-8 text-slate-600 hover:bg-slate-100"><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} className="h-8 w-8 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                    </div>
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