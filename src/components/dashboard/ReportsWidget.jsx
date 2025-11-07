
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BarChart, ArrowLeft, TrendingUp, Users, DollarSign } from "lucide-react";

export default function ReportsWidget({ clients, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fixed calculation - only actual revenue from paying clients  
  const actualClients = clients.filter(c => c.status === 'client');
  const totalRevenue = actualClients.reduce((sum, client) => sum + (client.paid || 0), 0);
  const activeClients = actualClients.length;
  const topClient = actualClients
    .filter(c => c.paid && c.paid > 0)
    .sort((a, b) => (b.paid || 0) - (a.paid || 0))[0];

  const statusCounts = {
    client: clients.filter(c => c.status === 'client').length,
    prospect: clients.filter(c => c.status === 'prospect').length,
    lead: clients.filter(c => c.status === 'lead').length,
    hot_lead: clients.filter(c => c.status === 'hot_lead').length,
  };

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <BarChart className="w-5 h-5 text-blue-600" />
            סיכום דוחות
          </CardTitle>
          <Link to={createPageUrl("Reports")}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              כל הדוחות
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {clients.length > 0 ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">הכנסות בפועל</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  ₪{totalRevenue.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">לקוחות פעילים</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {activeClients}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">ממוצע הכנסה ללקוח</span>
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  ₪{activeClients > 0 ? Math.round(totalRevenue / activeClients).toLocaleString() : '0'}
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-3">התפלגות לקוחות</h4>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-800">
                  לקוחות: {statusCounts.client}
                </Badge>
                <Badge className="bg-blue-100 text-blue-800">
                  פוטנציאליים: {statusCounts.prospect}
                </Badge>
                <Badge className="bg-orange-100 text-orange-800">
                  לידים חמים: {statusCounts.hot_lead}
                </Badge>
                <Badge className="bg-yellow-100 text-yellow-800">
                  לידים: {statusCounts.lead}
                </Badge>
              </div>
            </div>

            {/* Top Client - based on actual payments */}
            {topClient && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">לקוח מוביל (לפי תשלומים)</h4>
                <div className="bg-gradient-to-l from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900">{topClient.name}</div>
                      {topClient.company && (
                        <div className="text-sm text-slate-600">{topClient.company}</div>
                      )}
                    </div>
                    <div className="font-bold text-blue-700">
                      ₪{topClient.paid?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <BarChart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>אין נתונים להצגת דוחות</p>
            <p className="text-sm mt-1">הוסף לקוחות כדי לראות סטטיסטיקות</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
