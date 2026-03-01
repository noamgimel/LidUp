import React, { useState, useEffect } from "react";
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
import ClientDetails from "../components/clients/ClientDetails";
import MeetingForm from "../components/meetings/MeetingForm";
import LeadFilterTabs from "../components/clients/ClientStatusTabs";
import SortDropdown from "../components/clients/SortDropdown";
import { STAGE_TO_LIFECYCLE } from "../components/clients/LeadPriorityConfig";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [viewingClient, setViewingClient] = useState(null);
  const [selectedClientForMeeting, setSelectedClientForMeeting] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ work_stage: "all" });
  const [sortOption, setSortOption] = useState("recommended");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activePriority, setActivePriority] = useState("all");
  const [activeLifecycle, setActiveLifecycle] = useState("open");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterAndSortClients(); }, [clients, searchTerm, filters, sortOption, activePriority, activeLifecycle]);

  useEffect(() => {
    if (clients.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const clientIdToView = urlParams.get('viewClientId');
      if (clientIdToView) {
        const client = clients.find(c => c.id === clientIdToView);
        if (client) {
          handleViewDetails(client);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    }
  }, [clients]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      const [clientsResponse, meetingsData] = await Promise.all([
        base44.functions.invoke('getMyClients'),
        Meeting.list()
      ]);
      const clientsData = clientsResponse?.data?.clients || [];
      setClients(clientsData);
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error("[Clients] שגיאה בטעינת נתונים:", error);
    }
    setIsLoading(false);
  };

  const filterAndSortClients = () => {
    let filtered = [...clients];

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.work_stage !== "all") {
      if (filters.work_stage === "undefined") {
        filtered = filtered.filter(c => !c.work_stage);
      } else {
        filtered = filtered.filter(c => c.work_stage === filters.work_stage);
      }
    }

    // Priority filter
    if (activePriority !== "all") {
      filtered = filtered.filter(c => (c.priority || 'warm') === activePriority);
    }

    // Lifecycle filter
    filtered = filtered.filter(c => (c.lifecycle || 'open') === activeLifecycle);

    // Sort
    const priorityOrder = { overdue: 0, hot: 1, warm: 2, cold: 3 };
    switch (sortOption) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name, 'he'));
        break;
      case 'last_updated':
        filtered.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
        break;
      case 'recommended':
      default:
        filtered.sort((a, b) => {
          const pa = priorityOrder[a.priority || 'warm'] ?? 2;
          const pb = priorityOrder[b.priority || 'warm'] ?? 2;
          if (pa !== pb) return pa - pb;
          return new Date(b.created_date) - new Date(a.created_date);
        });
        break;
    }

    setFilteredClients(filtered);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({ work_stage: 'all' });
    setActivePriority("all");
    setActiveLifecycle("open");
  };

  // Counts for tabs
  const counts = React.useMemo(() => {
    const priority = { overdue: 0, hot: 0, warm: 0, cold: 0 };
    const lifecycle = { open: 0, won: 0, lost: 0 };
    clients.forEach(c => {
      const p = c.priority || 'warm';
      const l = c.lifecycle || 'open';
      if (priority[p] !== undefined) priority[p]++;
      if (lifecycle[l] !== undefined) lifecycle[l]++;
    });
    return { priority, lifecycle };
  }, [clients]);

  const handleSubmit = async (clientData) => {
    try {
      if (editingClient) {
        await base44.entities.Client.update(editingClient.id, clientData);
      } else {
        await base44.entities.Client.create(clientData);
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
      setShowMeetingForm(false);
      setSelectedClientForMeeting(null);
      loadData();
    } catch (error) {
      console.error("שגיאה בשמירת פגישה:", error);
    }
  };

  const handleViewDetails = (client) => {
    setViewingClient(client);
    setShowForm(false);
    setEditingClient(null);
    setTimeout(() => {
      const el = document.querySelector('[data-client-details]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      const el = document.querySelector('[data-meeting-form]');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDelete = async (clientId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק ליד זה?")) {
      try {
        await base44.functions.invoke('deleteClient', { client_id: clientId });
        if (viewingClient?.id === clientId) setViewingClient(null);
        loadData();
      } catch (error) {
        console.error("שגיאה במחיקת ליד:", error);
      }
    }
  };

  const handleExportClients = async () => {
    setIsExporting(true);
    toast({ title: "מייצא לידים...", description: "תהליך הייצוא החל. אנא המתן." });
    try {
      const response = await exportClients();
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.setAttribute("href", URL.createObjectURL(blob));
      link.setAttribute("download", "leads-export.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "הייצוא הושלם!", className: "bg-green-100 text-green-900 border-green-200" });
    } catch (error) {
      toast({ title: "שגיאה בייצוא", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAllClients = async () => {
    if (confirm("אזהרה: האם אתה בטוח שברצונך למחוק את כל הלידים? פעולה זו אינה הפיכה!")) {
      setIsLoading(true);
      try {
        const res = await base44.functions.invoke('getMyClients');
        const toDelete = res?.data?.clients || [];
        if (toDelete.length === 0) { toast({ title: "אין לידים למחיקה" }); setIsLoading(false); return; }
        await Promise.all(toDelete.map(c => base44.entities.Client.delete(c.id)));
        toast({ title: "הצלחה!", description: `נמחקו ${toDelete.length} לידים.`, className: "bg-green-100 text-green-900 border-green-200" });
        await loadData();
      } catch (error) {
        toast({ title: "שגיאה", description: "אירעה שגיאה במחיקת הלידים.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const hasActiveFilters = searchTerm || filters.work_stage !== 'all' || activePriority !== 'all';

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 min-h-screen transition-all duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">ניהול לידים</h1>
            <p className="text-slate-600">נהל את כל הלידים שלך במקום אחד</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => { setShowForm(true); setEditingClient(null); setViewingClient(null); }}
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg h-10"
            >
              <Plus className="w-4 h-4" />
              <span>ליד חדש</span>
            </Button>

            <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" dir="rtl">
                  <DialogTrigger asChild>
                    <DropdownMenuItem onSelect={() => setIsImportOpen(true)}>
                      <Upload className="ml-2 h-4 w-4" /><span>ייבוא לידים</span>
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DropdownMenuItem onSelect={handleExportClients} disabled={isExporting}>
                    <Download className="ml-2 h-4 w-4" /><span>{isExporting ? 'מייצא...' : 'יצוא לידים'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleDeleteAllClients} disabled={isLoading} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                    <Trash2 className="ml-2 h-4 w-4" /><span>מחק הכל (בדיקה)</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <ClientImportWizard onClose={() => setIsImportOpen(false)} onFinish={() => { loadData(); setIsImportOpen(false); }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search + Filters Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              <Input
                placeholder="חיפוש ליד..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full pr-10 bg-slate-50 border-slate-300 focus:border-blue-500"
              />
            </div>
            <ClientFilters filters={filters} onFiltersChange={setFilters} />
            <SortDropdown sortOption={sortOption} onSortChange={setSortOption} />
            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleClearFilters} size="icon" className="h-10 w-10 text-slate-600 hover:text-red-600 flex-shrink-0">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Priority + Lifecycle Tabs */}
        <LeadFilterTabs
          activePriority={activePriority}
          onPriorityChange={setActivePriority}
          activeLifecycle={activeLifecycle}
          onLifecycleChange={setActiveLifecycle}
          counts={counts}
        />

        {/* Client Details Panel */}
        <AnimatePresence>
          {viewingClient && (
            <motion.div data-client-details initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <ClientDetails
                client={viewingClient}
                meetings={meetings.filter(m => m.client_id === viewingClient.id)}
                onClose={() => setViewingClient(null)}
                onEdit={() => handleEdit(viewingClient)}
                onCreateMeeting={handleCreateMeeting}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Lead Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
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
            <motion.div data-meeting-form className="relative" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <div className="flex justify-end mb-4">
                <Button size="icon" variant="outline" onClick={() => { setShowMeetingForm(false); setSelectedClientForMeeting(null); }} className="bg-white hover:bg-red-50 border-red-200 text-red-600">
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
        <motion.div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <ClientList
            clients={filteredClients}
            isLoading={isLoading}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </motion.div>

        {/* Floating Add Button – Mobile */}
        <Button
          onClick={() => { setShowForm(true); setEditingClient(null); setViewingClient(null); }}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-all duration-300"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
  );
}