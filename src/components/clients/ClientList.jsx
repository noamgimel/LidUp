
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// Removed Table, TableBody, TableCell, TableHead, TableHeader, TableRow as per outline
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Building2, Mail, Phone, Eye, Users, TrendingUp } from "lucide-react"; // Eye added
import { motion, AnimatePresence } from "framer-motion";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { statusConfig } from "./ClientStatusTabs";

const statusLabels = {
  lead: "ליד",
  hot_lead: "ליד חם",
  client: "לקוח",
  inactive: "לא פעיל"
};

// Enhanced status colors with dark badges and solid row backgrounds
const statusColors = {
  lead: {
    badge: "bg-yellow-600 text-white border-yellow-600",
    row: "bg-amber-50",
    accent: "bg-yellow-500",
    workStageBadge: "bg-yellow-700 text-white border-yellow-700"
  },
  hot_lead: {
    badge: "bg-orange-600 text-white border-orange-600",
    row: "bg-orange-100",
    accent: "bg-orange-500",
    workStageBadge: "bg-orange-700 text-white border-orange-700"
  },
  client: {
    badge: "bg-green-600 text-white border-green-600",
    row: "bg-emerald-50",
    accent: "bg-green-500",
    workStageBadge: "bg-green-700 text-white border-green-700"
  },
  inactive: {
    badge: "bg-slate-500 text-white border-slate-500",
    row: "bg-slate-100",
    accent: "bg-slate-400",
    workStageBadge: "bg-slate-600 text-white border-slate-600"
  }
};

// Table background colors based on active tab with proper opacity
const getTableBackgroundColor = (activeTab) => {
  const backgrounds = {
    all: "bg-gradient-to-br from-blue-50/40 to-slate-50/40",
    lead: "bg-gradient-to-br from-yellow-50/40 to-yellow-100/30",
    hot_lead: "bg-gradient-to-br from-orange-50/40 to-orange-100/30",
    client: "bg-gradient-to-br from-green-50/40 to-green-100/30",
    inactive: "bg-gradient-to-br from-slate-50/40 to-slate-100/30"
  };
  return backgrounds[activeTab] || backgrounds.all;
};

// ClientCard component removed as its logic is now inlined in ClientList
// const ClientCard = ... (removed)

const ClientList = ({ clients, isLoading, onView, onEdit, onDelete, activeTab = 'all' }) => {
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

  if (isLoading) {
    const tableBackgroundColor = getTableBackgroundColor(activeTab);
    
    return (
      <div className={`${tableBackgroundColor} rounded-lg transition-all duration-500`}>
        {/* Desktop Skeleton */}
        <div className="hidden md:block p-6 rtl-text">
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/50 rounded-lg">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Skeleton */}
        <div className="md:hidden p-4 space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Card key={i} className="animate-pulse bg-white/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    const tableBackgroundColor = getTableBackgroundColor(activeTab);
    
    return (
      <div className={`${tableBackgroundColor} rounded-lg transition-all duration-500`}>
        <div className="p-8 md:p-12 text-center rtl-text">
          <Building2 className="w-12 h-12 md:w-16 md:h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">לא נמצאו לקוחות</h3>
          <p className="text-slate-500">נסה לשנות את הפילטרים או להוסיף לקוח חדש</p>
        </div>
      </div>
    );
  }

  // The main container no longer gets the background color directly
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
          <div className="col-span-1">סטטוס</div>
          <div className="col-span-2">שלב עבודה</div>
          <div className="col-span-1">פעולות</div>
        </div>
      </div>

      {/* Table Body - Desktop and Mobile */}
      <div className="divide-y divide-slate-200">
        <AnimatePresence>
          {clients.map((client, index) => {
            const statusStyle = statusColors[client.status] || statusColors.lead;
            const StatusIcon = statusConfig[client.status]?.icon || Users;
            const remainingPayment = (client.total_value || 0) - (client.paid || 0);

            return (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className={`transition-all duration-200 cursor-pointer border-r-4 border-transparent ${statusStyle.row} hover:shadow-lg hover:border-r-4`}
                onClick={() => onView(client)}
                style={{
                  '--hover-border-color': statusStyle.accent.includes('yellow') ? '#eab308' :
                                       statusStyle.accent.includes('orange') ? '#f97316' :
                                       statusStyle.accent.includes('green') ? '#22c55e' :
                                       '#64748b'
                }}
                onMouseEnter={(e) => {
                  const borderColor = statusStyle.accent.includes('yellow') ? '#eab308' :
                                    statusStyle.accent.includes('orange') ? '#f97316' :
                                    statusStyle.accent.includes('green') ? '#22c55e' :
                                    '#64748b';
                  e.currentTarget.style.borderRightColor = borderColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderRightColor = 'transparent';
                }}
              >
                {/* Desktop View */}
                <div className="hidden md:grid grid-cols-12 gap-3 p-4 items-center">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusStyle.accent}`}>
                        <StatusIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 truncate">{client.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-slate-700 truncate">{client.company || '-'}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-slate-700 truncate">{client.email}</p>
                  </div>
                  
                  <div className="col-span-1">
                    <p className="text-slate-600 text-sm">{client.phone || '-'}</p>
                  </div>

                  <div className="col-span-1">
                    <p className="text-slate-600 text-sm truncate">{client.source || '-'}</p>
                  </div>
                  
                  <div className="col-span-1">
                    <Badge className={`${statusStyle.badge} border whitespace-nowrap text-xs`}>
                      {statusLabels[client.status]}
                    </Badge>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="flex flex-col items-start">
                      {client.work_stage && workStageLabels[client.work_stage] ? (
                        <Badge className={`${workStageColors[client.work_stage]} border whitespace-nowrap text-xs`}>
                          {workStageLabels[client.work_stage]}
                        </Badge>
                      ) : (
                          <Badge className="bg-gray-600 text-white border-gray-600 whitespace-nowrap text-xs">
                              לא מוגדר
                          </Badge>
                      )}
                      {(client.status === 'client' || client.status === 'inactive') && (
                        <p className={`text-xs mt-1 ${remainingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {remainingPayment > 0 ? `יתרה: ₪${remainingPayment.toLocaleString()}` : 'הושלם'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="col-span-1">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(client);
                        }}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(client);
                        }}
                        className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(client.id);
                        }}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
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
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${statusStyle.accent}`}>
                          <StatusIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
                          <p className="text-sm text-slate-600 truncate">{client.company || client.email}</p>
                          {client.source && (
                            <p className="text-xs text-slate-500 truncate">מקור: {client.source}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge className={`${statusStyle.badge} border text-xs`}>
                          {statusLabels[client.status]}
                        </Badge>
                        {client.work_stage && workStageLabels[client.work_stage] ? (
                          <Badge className={`${workStageColors[client.work_stage]} border text-xs`}>
                            {workStageLabels[client.work_stage]}
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-600 text-white border-gray-600 text-xs">
                              לא מוגדר
                          </Badge>
                        )}
                      </div>
                      
                      {(client.status === 'client' || client.status === 'inactive') && (
                        <p className={`text-xs ${remainingPayment > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {remainingPayment > 0 ? `יתרה לתשלום: ₪${remainingPayment.toLocaleString()}` : 'התשלום הושלם'}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(client);
                        }}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(client);
                        }}
                        className="h-8 w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(client.id);
                        }}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
