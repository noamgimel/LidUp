import React, { useState, useEffect, useMemo, useRef } from "react";
import { Meeting } from "@/entities/Meeting";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Upload, Trash2, MoreVertical, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { exportClients } from "@/functions/exportClients";

import ClientImportWizard from "../components/clients/import/ClientImportWizard";
import ClientForm from "../components/clients/ClientForm";
import ClientList from "../components/clients/ClientList";
import ClientFilters from "../components/clients/ClientFilters";
import LeadDetails from "../components/clients/LeadDetails";
import MeetingForm from "../components/meetings/MeetingForm";
import WorkQueueTabs, { classifyLead } from "../components/clients/WorkQueueTabs";

import { computeLeadPriority } from "@/components/utils/timeUtils";
import DebugTimePanel from "@/components/clients/DebugTimePanel";
import { useServerTime } from "@/components/utils/ServerTimeContext";
import { useClientRealtimeSubscription } from "@/components/hooks/useClientRealtimeSubscription";


export default function Clients() {
  const { getNowMs, serverOffsetMs } = useServerTime();
  const computePriority = (c) => computeLeadPriority(c, getNowMs());

  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [selectedClientForMeeting, setSelectedClientForMeeting] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ work_stage: "all" });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overdue"); // default: overdue SLA
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    base44.auth.me().then(u => {
      if (u?.whatsapp_template) setWhatsappTemplate(u.whatsapp_template);
      if (u?.email) setCurrentUserEmail(u.email);
    });
  }, []);

  // Realtime polling — merges new/updated leads into state without full reload
  useRealtimePolling({
    userEmail: currentUserEmail,
    lastSyncAtRef,
    onNewLeads: (newLeads) => {
      setClients(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const brandNew = newLeads.filter(l => !existingIds.has(l.id));
        if (brandNew.length === 0) return prev;
        const count = brandNew.length;
        toast({
          title: count === 1 ? "נקלט ליד חדש 🎉" : `נקלטו ${count} לידים חדשים 🎉`,
          className: "bg-blue-50 text-blue-900 border-blue-200"
        });
        return [...brandNew, ...prev];
      });
    },
    onUpdatedLeads: (updatedLeads) => {
      setClients(prev => {
        const now = getNowMs();
        let slaBreachCount = 0;
        const prevMap = new Map(prev.map(c => [c.id, c]));

        updatedLeads.forEach(updated => {
          const old = prevMap.get(updated.id);
          if (!old) return;
          // Detect SLA transition: was NOT breached, now IS breached
          const wasBreached = !old.first_response_at &&
            (now - new Date(old.created_date).getTime()) > 30 * 60 * 1000;
          const nowBreached = !updated.first_response_at &&
            (now - new Date(updated.created_date).getTime()) > 30 * 60 * 1000;
          if (!wasBreached && nowBreached) slaBreachCount++;
          prevMap.set(updated.id, { ...old, ...updated });
        });

        if (slaBreachCount > 0) {
          toast({
            title: slaBreachCount === 1
              ? "ליד חרג מ-SLA ⚠️"
              : `${slaBreachCount} לידים חרגו מ-SLA ⚠️`,
            className: "bg-red-50 text-red-900 border-red-200"
          });
        }

        return Array.from(prevMap.values());
      });
    }
  });

  useEffect(() => {
    if (clients.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const clientIdToView = urlParams.get("viewClientId");
      if (clientIdToView) {
        const c = clients.find(x => x.id === clientIdToView);
        if (c) { handleViewDetails(c); window.history.replaceState({}, "", window.location.pathname); }
      }
    }
  }, [clients]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsResponse, meetingsData] = await Promise.all([
        base44.functions.invoke("getMyClients"),
        Meeting.list()
      ]);
      const freshClients = clientsResponse?.data?.clients || [];
      setClients(freshClients);
      setMeetings(meetingsData || []);
      // Keep viewingClient in sync so LeadDetails gets fresh initialClient
      setViewingClient(prev => prev ? (freshClients.find(c => c.id === prev.id) || prev) : null);
    } catch (error) {
      console.error("[Clients] error:", error);
    }
    setIsLoading(false);
  };

  // Tick every 10s to recompute SLA status locally without fetching
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Enrich with computed priority
  const enrichedClients = useMemo(() =>
    clients.map(c => ({ ...c, priority: computePriority(c) })),
    [clients, tick]
  );

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts = { overdue: 0, new: 0, followup: 0, active: 0, closed: 0 };
    const now = getNowMs();
    enrichedClients.forEach(c => {
      const tab = classifyLead(c, now);
      if (counts[tab] !== undefined) counts[tab]++;
    });
    return counts;
  }, [enrichedClients, serverOffsetMs]);

  // Filter + sort per tab
  const filteredClients = useMemo(() => {
    const now = getNowMs();
    let list = enrichedClients.filter(c => classifyLead(c, now) === activeTab);

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    if (filters.work_stage !== "all") {
      list = filters.work_stage === "undefined"
        ? list.filter(c => !c.work_stage)
        : list.filter(c => c.work_stage === filters.work_stage);
    }

    // Auto-sort per tab
    if (activeTab === "overdue") {
      list.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)); // oldest first
    } else if (activeTab === "new") {
      list.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)); // newest first
    } else if (activeTab === "followup") {
      list.sort((a, b) => new Date(a.next_followup_at || 0) - new Date(b.next_followup_at || 0));
    } else {
      list.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
    }

    return list;
  }, [enrichedClients, activeTab, searchTerm, filters]);

  const handleSubmit = async (clientData) => {
    try {
      if (editingClient) {
        await base44.entities.Client.update(editingClient.id, { ...clientData });
        await base44.entities.LeadActivity.create({
          lead_id: editingClient.id,
          event_type: "stage_change",
          content: "פרטי הליד עודכנו",
          created_by_email: (await base44.auth.me())?.email || ""
        });
      } else {
        const user = await base44.auth.me();
        const newLead = await base44.entities.Client.create({
          ...clientData,
          work_stage: clientData.work_stage || "new_lead",
          owner_email: user?.email || ""
        });
        await base44.entities.LeadActivity.create({
          lead_id: newLead.id,
          event_type: "created",
          content: "ליד נקלט ידנית",
          created_by_email: user?.email || ""
        });
      }
      setShowForm(false);
      setEditingClient(null);
      loadData();
    } catch (error) {
      console.error("שגיאה בשמירת ליד:", error);
    }
  };

  const handleMeetingSubmit = async (meetingData) => {
    try {
      const user = await User.me();
      await Meeting.create({
        ...meetingData,
        client_id: selectedClientForMeeting.id,
        client_name: selectedClientForMeeting.name,
        client_email: selectedClientForMeeting.email || "",
        created_by_email: user?.email || ""
      });
      await base44.entities.LeadActivity.create({
        lead_id: selectedClientForMeeting.id,
        event_type: "meeting_created",
        content: `פגישה נוצרה: ${meetingData.title}`,
        created_by_email: user?.email || ""
      });
      // last_activity_at is set server-side only — no frontend timestamp writes
      setShowMeetingForm(false);
      setSelectedClientForMeeting(null);
      loadData();
    } catch (error) {
      console.error("שגיאה בשמירת פגישה:", error);
    }
  };

  const handleViewDetails = (client) => {
    // Always use the enriched/fresh version so we get the latest next_followup_at etc.
    const fresh = enrichedClients.find(c => c.id === client.id) || client;
    // שמור first_response_at ו-last_contact_at אם כבר הוגדרו בסשן הנוכחי
    setViewingClient(prev => {
      if (prev?.id === fresh.id) {
        return {
          ...fresh,
          first_response_at: prev.first_response_at || fresh.first_response_at,
          last_contact_at: prev.last_contact_at || fresh.last_contact_at,
        };
      }
      return fresh;
    });
    setShowForm(false);
    setEditingClient(null);
    setTimeout(() => {
      const el = document.querySelector("[data-client-details]");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
    setViewingClient(null);
  };

  const handleCreateMeeting = (client) => {
    setSelectedClientForMeeting(client);
    setShowMeetingForm(true);
    setTimeout(() => {
      const el = document.querySelector("[data-meeting-form]");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleDelete = async (clientId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק ליד זה?")) {
      try {
        await base44.functions.invoke("deleteClient", { client_id: clientId });
        if (viewingClient?.id === clientId) setViewingClient(null);
        loadData();
      } catch (error) {
        console.error("שגיאה במחיקת ליד:", error);
      }
    }
  };

  const handleExportClients = async () => {
    setIsExporting(true);
    try {
      const response = await exportClients();
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", "leads-export.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "הייצוא הושלם!", className: "bg-green-100 text-green-900 border-green-200" });
    } catch {
      toast({ title: "שגיאה בייצוא", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllClients = async () => {
    if (confirm("אזהרה: מחיקת כל הלידים. פעולה אינה הפיכה!")) {
      setIsLoading(true);
      try {
        const res = await base44.functions.invoke("getMyClients");
        const toDelete = res?.data?.clients || [];
        await Promise.all(toDelete.map(c => base44.entities.Client.delete(c.id)));
        toast({ title: `נמחקו ${toDelete.length} לידים.`, className: "bg-green-100 text-green-900 border-green-200" });
        await loadData();
      } catch {
        toast({ title: "שגיאה", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const hasActiveFilters = searchTerm || filters.work_stage !== "all";

  // When viewing client, find enriched version
  const enrichedViewingClient = viewingClient
    ? enrichedClients.find(c => c.id === viewingClient.id) || viewingClient
    : null;

  return (
    <div className="px-4 pt-20 pb-6 sm:px-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">ניהול לידים</h1>
            <p className="text-slate-500 text-sm mt-1">תיבת העבודה שלך — פעל לפי מה שדחוף עכשיו</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setShowForm(true); setEditingClient(null); setViewingClient(null); }}
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />ליד חדש
            </Button>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" dir="rtl">
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={() => setIsImportOpen(true)}>
                      <Upload className="ml-2 h-4 w-4" />ייבוא לידים
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DropdownMenuItem onSelect={handleExportClients} disabled={isExporting}>
                    <Download className="ml-2 h-4 w-4" />{isExporting ? "מייצא..." : "יצוא לידים"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleDeleteAllClients} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                    <Trash2 className="ml-2 h-4 w-4" />מחק הכל (בדיקה)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <ClientImportWizard onClose={() => setIsImportOpen(false)} onFinish={() => { loadData(); setIsImportOpen(false); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Debug Panel — only visible with ?debug=1 in URL */}
        <DebugTimePanel clients={enrichedClients} />

        {/* Work Queue Tabs */}
        <WorkQueueTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

        {/* Search + Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              placeholder="חיפוש לפי שם, טלפון, אימייל..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pr-10 bg-slate-50 border-slate-200 text-right"
            />
          </div>
          <ClientFilters filters={filters} onFiltersChange={setFilters} />
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={() => { setSearchTerm(""); setFilters({ work_stage: "all" }); }} className="text-slate-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Lead Details Panel */}
        <AnimatePresence>
          {viewingClient && enrichedViewingClient && (
            <LeadDetails
              key={viewingClient.id}
              client={enrichedViewingClient}
              meetings={meetings.filter(m => m.client_id === viewingClient.id)}
              onClose={() => setViewingClient(null)}
              onEdit={() => handleEdit(viewingClient)}
              onCreateMeeting={handleCreateMeeting}
              onRefresh={(updatedFields) => {
          if (updatedFields && viewingClient?.id) {
            // עדכן מיידית את clients state כדי ש-enrichedClients יהיה מעודכן
            setClients(prev => prev.map(c =>
              c.id === viewingClient.id ? { ...c, ...updatedFields } : c
            ));
          }
          loadData();
        }}
            />
          )}
        </AnimatePresence>

        {/* Lead Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <ClientForm
                client={editingClient}
                onSubmit={handleSubmit}
                onCancel={() => { setShowForm(false); setEditingClient(null); }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meeting Form */}
        <AnimatePresence>
          {showMeetingForm && selectedClientForMeeting && (
            <motion.div data-meeting-form initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="flex justify-end mb-2">
                <Button size="icon" variant="outline" onClick={() => { setShowMeetingForm(false); setSelectedClientForMeeting(null); }} className="border-red-200 text-red-500 hover:bg-red-50">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <MeetingForm
                meeting={null}
                clients={[selectedClientForMeeting]}
                onSubmit={handleMeetingSubmit}
                onCancel={() => { setShowMeetingForm(false); setSelectedClientForMeeting(null); }}
                preSelectedClient={selectedClientForMeeting}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leads Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <ClientList
            clients={filteredClients}
            isLoading={isLoading}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            whatsappTemplate={whatsappTemplate}
          />
        </div>

        {/* Mobile FAB */}
        <Button
          onClick={() => { setShowForm(true); setEditingClient(null); setViewingClient(null); }}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-blue-600 shadow-xl flex items-center justify-center z-40"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}