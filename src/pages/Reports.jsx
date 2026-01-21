import React, { useState, useEffect } from "react";
import { Client } from "@/entities/Client";
import { Meeting } from "@/entities/Meeting";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Flame,
  Calculator
} from "lucide-react";
import { format, subDays, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';
import SalesTrendChart from "../components/reports/SalesTrendChart";
import LeadsClientsTrendChart from "../components/reports/LeadsClientsTrendChart";
import WorkspaceAuthGuard from "../components/auth/WorkspaceAuthGuard";

// Enhanced Stat Card Component with consistent styling
const EnhancedStatCard = ({ title, value, subValue, icon: Icon, color, bgColor, description }) => (
  <Card className="shadow-sm border-slate-200 hover:shadow-lg transition-all duration-300">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
      <div className={`p-3 rounded-xl ${bgColor || 'bg-slate-100'}`}>
        <Icon className={`w-5 h-5 ${color || 'text-slate-600'}`} />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
      {subValue && <div className="text-sm text-slate-600 mb-1">{subValue}</div>}
      {description && (
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

// Improved Lead Conversion Analysis - showing actual conversion from leads to clients
const LeadConversionAnalysis = ({ clients }) => {
  // Calculate actual lead conversion metrics
  const totalLeads = clients.filter(c => c.status === 'lead' || c.status === 'hot_lead').length;
  const totalClients = clients.filter(c => c.status === 'client').length;
  const hotLeads = clients.filter(c => c.status === 'hot_lead').length;
  const regularLeads = clients.filter(c => c.status === 'lead').length;
  
  // For now, we'll calculate based on current status distribution
  // In a real scenario, this would be based on status history/changes over time
  const totalLeadsAndClients = totalLeads + totalClients;
  const conversionRate = totalLeadsAndClients > 0 ? Math.round((totalClients / totalLeadsAndClients) * 100) : 0;
  
  // Calculate hot leads vs regular leads conversion potential
  const hotLeadConversionPotential = hotLeads > 0 ? Math.round((hotLeads / (hotLeads + regularLeads)) * 100) : 0;

  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          ניתוח המרת לידים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="text-2xl font-bold text-green-900">{conversionRate}%</div>
            <div className="text-sm text-green-700">שיעור המרה כללי</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-2xl font-bold text-blue-900">{totalLeads}</div>
            <div className="text-sm text-blue-700">לידים פעילים</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div className="text-2xl font-bold text-purple-900">{totalClients}</div>
            <div className="text-sm text-purple-700">לקוחות שהומרו</div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold text-slate-900">פירוט לידים:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-slate-900">לידים חמים</span>
              </div>
              <span className="font-bold text-orange-700 text-xl">{hotLeads}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-slate-900">לידים רגילים</span>
              </div>
              <span className="font-bold text-yellow-700 text-xl">{regularLeads}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced Future Revenue Forecast with 3 key metrics
const RevenueForecast = ({ clients, meetings }) => {
  const upcomingMeetings = meetings.filter(m => 
    new Date(m.date) >= new Date() && m.status === 'scheduled'
  );
  
  // Calculate potential revenue from all leads
  const allLeads = clients.filter(c => c.status === 'lead' || c.status === 'hot_lead');
  const hotLeads = clients.filter(c => c.status === 'hot_lead');
  
  // Total potential revenue from all leads
  const totalPotentialFromAllLeads = allLeads.reduce((sum, client) => sum + (client.total_value || 0), 0);
  const totalPotentialFromHotLeads = hotLeads.reduce((sum, client) => sum + (client.total_value || 0), 0);
  
  // Expected revenue if all deals close
  const expectedRevenueIfAllClose = totalPotentialFromAllLeads;

  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          תחזית הכנסות עתידיות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-xl font-bold text-blue-900">₪{totalPotentialFromAllLeads.toLocaleString()}</div>
            <div className="text-sm text-blue-700">הכנסות פוטנציאליות מכלל הלידים</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100">
            <div className="text-xl font-bold text-orange-900">₪{totalPotentialFromHotLeads.toLocaleString()}</div>
            <div className="text-sm text-orange-700">הכנסות פוטנציאליות מלידים חמים</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
            <div className="text-xl font-bold text-green-900">₪{expectedRevenueIfAllClose.toLocaleString()}</div>
            <div className="text-sm text-green-700">הכנסות צפויות אם כל העסקאות ייסגרו</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">פגישות מתוכננות</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{upcomingMeetings.length}</div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-600">ממוצע ערך עסקה</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              ₪{allLeads.length > 0 ? Math.round(totalPotentialFromAllLeads / allLeads.length).toLocaleString() : '0'}
            </div>
          </div>
        </div>

        {allLeads.length > 0 && (
          <div className="mt-6">
            <h4 className="font-semibold text-slate-900 mb-3">לידים מובילים (לפי ערך עסקה):</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {allLeads
                .filter(client => (client.total_value || 0) > 0)
                .sort((a, b) => (b.total_value || 0) - (a.total_value || 0))
                .slice(0, 5)
                .map(client => (
                  <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900">{client.name}</span>
                      <Badge className={client.status === 'hot_lead' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}>
                        {client.status === 'hot_lead' ? 'ליד חם' : 'ליד'}
                      </Badge>
                    </div>
                    <span className="font-bold text-slate-900">₪{(client.total_value || 0).toLocaleString()}</span>
                  </div>
                ))}
            </div>
            {allLeads.filter(client => (client.total_value || 0) > 0).length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">אין לידים עם ערך עסקה מוגדר עדיין</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function Reports() {
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        const workspaceId = localStorage.getItem('currentWorkspaceId');
        if (!workspaceId) {
          console.error("אין Workspace נבחר");
          setIsLoading(false);
          return;
        }
        
        const [clientsData, meetingsData] = await Promise.all([
          Client.filter({ workspace_id: workspaceId }),
          Meeting.filter({ workspace_id: workspaceId })
        ]);
        setClients(clientsData || []);
        setMeetings(meetingsData || []);
      } catch (error) {
        console.error("שגיאה בטעינת נתונים:", error);
        setClients([]);
        setMeetings([]);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Calculate metrics - based on paid amounts only
  const totalClients = clients.filter(c => c.status === 'client').length;
  const totalRevenue = clients.reduce((sum, client) => sum + (client.paid || 0), 0); // Changed to paid
  const avgDealValue = totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0;

  if (isLoading) {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-6 rtl-text">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <WorkspaceAuthGuard>
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-8 min-h-screen rtl-text">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">דוחות ואנליטיקה</h1>
          <p className="text-slate-600 mt-1">תובנות עמוקות ואנליטיקות לקבלת החלטות עסקיות</p>
        </div>

        {/* 1. Lead Conversion Analysis */}
        <div className="mb-8">
          <LeadConversionAnalysis clients={clients} />
        </div>

        {/* 2. Future Revenue Forecast */}
        <div className="mb-8">
          <RevenueForecast clients={clients} meetings={meetings} />
        </div>

        {/* 3. Leads & Clients Trend Chart */}
        <div className="mb-8">
          <LeadsClientsTrendChart clients={clients} />
        </div>

        {/* 4. Average Deal Value */}
        <div className="mb-8">
          <EnhancedStatCard
            title="ממוצע הכנסה ללקוח"
            value={`₪${avgDealValue.toLocaleString()}`}
            icon={DollarSign}
            color="text-green-600"
            bgColor="bg-green-100"
            description={`מבוסס על ${totalClients} לקוחות עם סך הכנסות של ₪${totalRevenue.toLocaleString()} (תשלומים בפועל)`}
          />
        </div>

        {/* 5. Sales Trend Chart */}
        <div className="mb-8">
          <SalesTrendChart clients={clients} />
        </div>
      </div>
    </div>
    </WorkspaceAuthGuard>
  );
}