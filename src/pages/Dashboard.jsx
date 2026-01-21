import React, { useState, useEffect } from "react";
import { Client } from "@/entities/Client";
import { Meeting } from "@/entities/Meeting";
import { User } from "@/entities/User";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Calendar,
  TrendingUp,
  Plus,
  Banknote
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";

import StatsCard from "../components/dashboard/StatsCard";
import RecentClients from "../components/dashboard/RecentClients";
import UpcomingMeetings from "../components/dashboard/UpcomingMeetings";
import LeadsClientsTrendChart from "../components/reports/LeadsClientsTrendChart";
import ReportsWidget from "../components/dashboard/ReportsWidget";
import WorkspaceAuthGuard from "../components/auth/WorkspaceAuthGuard";

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

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
        Client.filter({ workspace_id: workspaceId }, "-created_date"),
        Meeting.filter({ workspace_id: workspaceId }, "-date")
      ]);
      setClients(clientsData);
      setMeetings(meetingsData);
    } catch (error) {
      console.error("שגיאה בטעינת הנתונים:", error);
    }
    setIsLoading(false);
  };

  // --- Calculations for Stats Cards ---

  // Main metrics
  const leadsCount = clients.filter(client => client.status === 'lead' || client.status === 'hot_lead').length;
  const activeClients = clients.filter(client => client.status === 'client');
  const activeClientsCount = activeClients.length;
  const totalRevenue = activeClients.reduce((sum, client) => sum + (client.paid || 0), 0);
  const totalValue = activeClients.reduce((sum, client) => sum + (client.total_value || 0), 0);
  const remainingPayments = totalValue - totalRevenue;

  // New metrics for subtitles
  const startOfThisMonth = startOfMonth(new Date());
  
  const newLeadsThisMonth = clients.filter(client => {
    const createdDate = new Date(client.created_date);
    return (client.status === 'lead' || client.status === 'hot_lead') && createdDate >= startOfThisMonth;
  }).length;

  const newClientsThisMonth = clients.filter(client => {
    const createdDate = new Date(client.created_date);
    return client.status === 'client' && createdDate >= startOfThisMonth;
  }).length;
  
  // --- End of Calculations ---

  return (
    <WorkspaceAuthGuard>
      <div className="px-3 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 md:space-y-6 min-h-screen rtl-text">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-6 mb-4 md:mb-8">
          <div className="text-right">
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-2">דשבורד ראשי</h1>
            <p className="text-sm md:text-base text-slate-600">סקירה כללית של פעילות המערכת</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-start">
             <Link to={createPageUrl("Clients")} className="w-full sm:w-auto">
              <Button size="sm" className="bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg text-right w-full sm:w-auto">
                <span>לקוח חדש</span>
                <Plus className="w-4 h-4" />
              </Button>
            </Link>
            <Link to={createPageUrl("Meetings")} className="w-full sm:w-auto">
               <Button size="sm" className="bg-gradient-to-l from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 gap-2 shadow-lg text-right w-full sm:w-auto">
                <span>פגישות ({meetings.length})</span>
                <Calendar className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8">
          <StatsCard
            title="סך הכל לידים"
            value={leadsCount}
            subTitle={`לידים חדשים החודש: ${newLeadsThisMonth}`}
            icon={Users}
            colorScheme="blue"
          />
          
          <StatsCard
            title="לקוחות פעילים"
            value={activeClientsCount}
            subTitle={`לקוחות חדשים החודש: ${newClientsThisMonth}`}
            icon={TrendingUp}
            colorScheme="green"
          />

          <StatsCard
            title="הכנסות בפועל"
            value={`₪${totalRevenue.toLocaleString()}`}
            subTitle={remainingPayments > 0 ? `יתרה לתשלום: ₪${remainingPayments.toLocaleString()}` : 'כל התשלומים התקבלו'}
            icon={Banknote}
            colorScheme="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          <div className="lg:col-span-2 space-y-4 md:space-y-8">
            <RecentClients clients={clients} isLoading={isLoading} />
            <ReportsWidget clients={clients} isLoading={isLoading} />
            <div className="hidden md:block">
              <LeadsClientsTrendChart clients={clients} />
            </div>
          </div>

          <div className="space-y-4 md:space-y-8">
            <UpcomingMeetings meetings={meetings} isLoading={isLoading} />
            <div className="md:hidden">
              <LeadsClientsTrendChart clients={clients} />
            </div>
          </div>
        </div>
      </div>
    </div>
    </WorkspaceAuthGuard>
  );
}