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
  Plus
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
import WorkBlockList from "../components/dashboard/WorkBlockList";

const SLA_MINUTES = 30;
function computePriorityDash(c) {
  const now = Date.now();
  const lifecycle = c.lifecycle || "open";
  if (lifecycle !== "open") return c.priority || "warm";
  const createdMs = new Date(c.created_date).getTime();
  const minutesSince = (now - createdMs) / 60000;
  const followupMs = c.next_followup_at ? new Date(c.next_followup_at).getTime() : null;
  if ((!c.first_response_at && minutesSince >= SLA_MINUTES) || (followupMs && followupMs <= now)) return "overdue";
  return c.priority || "warm";
}

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      const [clientsData, meetingsData] = await Promise.all([
        Client.list("-created_date"),
        Meeting.list("-date")
      ]);
      setClients(clientsData);
      setMeetings(meetingsData);
    } catch (error) {
      console.error("שגיאה בטעינת הנתונים:", error);
    }
    setIsLoading(false);
  };

  // --- Calculations ---
  const startOfThisMonth = startOfMonth(new Date());
  const enriched = clients.map(c => ({ ...c, priority: computePriorityDash(c) }));
  const openLeads = enriched.filter(c => (c.lifecycle || 'open') === 'open');
  const leadsCount = openLeads.length;
  const hotLeads = openLeads.filter(c => c.priority === 'hot' || c.priority === 'overdue').length;
  const wonLeads = enriched.filter(c => c.lifecycle === 'won').length;
  const newLeadsThisMonth = enriched.filter(c => new Date(c.created_date) >= startOfThisMonth).length;
  const wonThisMonth = enriched.filter(c => c.lifecycle === 'won' && new Date(c.updated_date || c.created_date) >= startOfThisMonth).length;

  // Work blocks
  const now = new Date();
  const endOfToday = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const overdueLeads = openLeads
    .filter(c => c.priority === 'overdue')
    .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  const followupTodayLeads = openLeads
    .filter(c => c.next_followup_at && new Date(c.next_followup_at) <= endOfToday)
    .sort((a, b) => new Date(a.next_followup_at) - new Date(b.next_followup_at));
  const newNoContactLeads = openLeads
    .filter(c => !c.first_response_at)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  // --- End of Calculations ---

  return (
    <div className="px-3 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 md:space-y-6 min-h-screen rtl-text">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-6 mb-4 md:mb-8">
          <div className="text-right">
            <h1 className="text-xl md:text-3xl font-bold text-slate-900 mb-2">דשבורד ראשי</h1>
            <p className="text-sm md:text-base text-slate-600">סקירה כללית של פעילות הלידים</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-start">
             <Link to={createPageUrl("Clients")} className="w-full sm:w-auto">
              <Button size="sm" className="bg-gradient-to-l from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg text-right w-full sm:w-auto">
                     <span>ליד חדש</span>
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
            title="לידים פעילים"
            value={leadsCount}
            subTitle={`חדשים החודש: ${newLeadsThisMonth}`}
            icon={Users}
            colorScheme="blue"
          />
          
          <StatsCard
            title="חמים / חורגים SLA"
            value={hotLeads}
            subTitle="דורשים טיפול מיידי"
            icon={TrendingUp}
            colorScheme="green"
          />

          <StatsCard
            title="נסגרו בהצלחה ✅"
            value={wonLeads}
            subTitle={`נסגרו החודש: ${wonThisMonth}`}
            icon={TrendingUp}
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
  );
}