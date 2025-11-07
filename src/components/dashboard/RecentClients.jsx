
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { statusConfig } from "../clients/ClientStatusTabs"; // Import statusConfig

const statusLabels = {
  lead: "ליד",
  hot_lead: "ליד חם",
  client: "לקוח",
  inactive: "לא פעיל"
};

const statusColors = {
  lead: {
    badge: "bg-yellow-600 text-white border-yellow-600",
    row: "bg-amber-50",
    accent: "bg-yellow-500",
  },
  hot_lead: {
    badge: "bg-orange-600 text-white border-orange-600",
    row: "bg-orange-100",
    accent: "bg-orange-500",
  },
  client: {
    badge: "bg-green-600 text-white border-green-600",
    row: "bg-emerald-50",
    accent: "bg-green-500",
  },
  inactive: {
    badge: "bg-slate-500 text-white border-slate-500",
    row: "bg-slate-100",
    accent: "bg-slate-400",
  }
};

export default function RecentClients({ clients, isLoading }) {
  const { userWorkStages } = useUserWorkStages();

  // Create work stage labels and colors mapping
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

  return (
    <Card className="shadow-sm border-slate-200 bg-gradient-to-br from-blue-50/40 to-slate-50/40 rounded-lg overflow-hidden">
      <CardHeader className="bg-slate-700 border-b border-slate-600 p-4">
        <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-100">
          <Users className="w-5 h-5 text-slate-100" />
          לקוחות אחרונים
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white/50 rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : clients.length > 0 ? (
            <>
              <div className="divide-y divide-slate-200/60">
                {clients.slice(0, 3).map((client, index) => {
                  const statusStyle = statusColors[client.status] || statusColors.lead;
                  const StatusIcon = statusConfig[client.status]?.icon || Users;
                  const remainingPayment = (client.total_value || 0) - (client.paid || 0);

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`${statusStyle.row} hover:bg-white/70 transition-all duration-200 cursor-pointer`}
                    >
                      <Link to={createPageUrl(`Clients?viewClientId=${client.id}`)} className="block p-3">
                        <div className="flex items-center gap-4">
                          <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${statusStyle.accent}`}>
                            <StatusIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate">{client.name}</h4>
                            {client.company && (
                              <p className="text-sm text-slate-600 truncate">{client.company}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 text-right">
                            {(client.status === 'client' || client.status === 'inactive') && (
                              <span className={`font-semibold whitespace-nowrap text-sm ${remainingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {remainingPayment > 0 ? `יתרה: ₪${remainingPayment.toLocaleString()}` : 'התשלום הושלם'}
                              </span>
                            )}
                            <div className="flex gap-2">
                              <Badge className={`${statusStyle.badge} border whitespace-nowrap text-xs`}>
                                {statusLabels[client.status] || client.status}
                              </Badge>
                              {client.work_stage && workStageLabels[client.work_stage] && (
                                <Badge className={`${workStageColors[client.work_stage]} border whitespace-nowrap text-xs`}>
                                  {workStageLabels[client.work_stage]}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
              {/* Button at bottom */}
              <div className="p-3 bg-slate-100/50">
                <Link to={createPageUrl("Clients")}>
                  <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full gap-2 shadow-md">
                    <ArrowLeft className="w-4 h-4" />
                    כל הלקוחות
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">אין לקוחות עדיין</h3>
              <p className="text-slate-500 mb-4">התחל על ידי הוספת הלקוח הראשון שלך</p>
              <Link to={createPageUrl("Clients")}>
                <Button className="bg-gradient-to-r from-blue-600 to-blue-700">
                  הוסף לקוח
                </Button>
              </Link>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
