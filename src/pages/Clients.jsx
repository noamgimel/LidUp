import React, { useState, useEffect } from "react";
import { Client } from "@/entities/Client";
import { Meeting } from "@/entities/Meeting";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Plus, Search, X, Upload, Trash2, MoreVertical, Download } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { exportClients } from "@/functions/exportClients"; // Import the export function

import ClientImportWizard from "../components/clients/import/ClientImportWizard";
import ClientForm from "../components/clients/ClientForm";
import ClientList from "../components/clients/ClientList";
import ClientFilters from "../components/clients/ClientFilters";
import ClientDetails from "../components/clients/ClientDetails";
import MeetingForm from "../components/meetings/MeetingForm";
import ClientStatusTabs from "../components/clients/ClientStatusTabs";
import SortDropdown from "../components/clients/SortDropdown";
import WorkspaceAuthGuard from "../components/auth/WorkspaceAuthGuard";

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
  const [filters, setFilters] = useState({ status: "all", work_stage: "all" });
  const [sortOption, setSortOption] = useState("recommended"); // Add sort state
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState("all");
  // isSearchOpen state is no longer needed as search input is always visible
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortClients(); // Changed function name for clarity
  }, [clients, searchTerm, filters, sortOption]); // Add sortOption to dependencies

  useEffect(() => {
    if (clients.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const clientIdToView = urlParams.get('viewClientId');
      if (clientIdToView) {
        const client = clients.find(c => c.id === clientIdToView);
        if (client) {
          handleViewDetails(client);
          // Clean the URL to avoid re-opening on every refresh
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        }
      }
    }
  }, [clients]);

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
        Meeting.filter({ workspace_id: workspaceId })
      ]);
      
      setClients(clientsData || []);
      setMeetings(meetingsData || []);
    } catch (error) {
      console.error("שגיאה בטעינת נתונים:", error);
    }
    setIsLoading(false);
  };

  const filterAndSortClients = () => {
    let filtered = [...clients]; // Create a mutable copy

    // --- Filtering ---
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Preserve existing status filter from ClientFilters, even if tabs are present
    if (filters.status !== "all") {
      filtered = filtered.filter(client => client.status === filters.status);
    }
    
    if (filters.work_stage !== "all") {
      if (filters.work_stage === "undefined") {
        filtered = filtered.filter(client => !client.work_stage);
      } else {
        filtered = filtered.filter(client => client.work_stage === filters.work_stage);
      }
    }
    
    // --- Sorting Logic ---
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
        // Assuming 'updated_date' exists on the client object
        filtered.sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));
        break;
      case 'recommended':
      default:
        const statusOrder = {
          lead: 1,
          hot_lead: 2,
          client: 3,
          inactive: 4
        };

        filtered.sort((a, b) => {
          const statusComparison = statusOrder[a.status] - statusOrder[b.status];
          if (statusComparison !== 0) {
            return statusComparison;
          }
          // If statuses are the same, sort by most recently created
          return new Date(b.created_date) - new Date(a.created_date);
        });
        break;
    }

    setFilteredClients(filtered);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters(prev => ({...prev, work_stage: 'all', status: 'all'})); // Also clear status filter
    setActiveStatusTab("all"); // Reset active status tab as well
  };

  // Calculate status counts
  const statusCounts = React.useMemo(() => {
    return {
      lead: clients.filter(c => c.status === 'lead').length,
      hot_lead: clients.filter(c => c.status === 'hot_lead').length,
      client: clients.filter(c => c.status === 'client').length,
      inactive: clients.filter(c => c.status === 'inactive').length
    };
  }, [clients]);

  // Filter clients based on active tab
  const getFilteredClientsByTab = () => {
    let filtered = filteredClients; // Use the already filtered and sorted clients
    
    if (activeStatusTab !== 'all') {
      filtered = filtered.filter(client => client.status === activeStatusTab);
    }
    
    return filtered;
  };

  const tabFilteredClients = getFilteredClientsByTab();

  const handleSubmit = async (clientData) => {
    try {
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (!workspaceId) {
        alert("שגיאה: אין Workspace נבחר");
        return;
      }

      if (editingClient) {
        await Client.update(editingClient.id, clientData);
      } else {
        await Client.create({ ...clientData, workspace_id: workspaceId });
      }
      setShowForm(false);
      setEditingClient(null);
      loadData();
    } catch (error) {
      console.error("שגיאה בשמירת לקוח:", error);
    }
  };

  const handleMeetingSubmit = async (meetingData) => {
    try {
      const user = await User.me();
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      
      if (!workspaceId) {
        alert("שגיאה: אין Workspace נבחר");
        return;
      }
      
      const finalMeetingData = {
        ...meetingData,
        client_id: selectedClientForMeeting.id,
        client_name: selectedClientForMeeting.name,
        client_email: selectedClientForMeeting.email || "",
        created_by_email: user?.email || "",
        workspace_id: workspaceId
      };
      
      await Meeting.create(finalMeetingData);
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
    
    // גלילה אוטומטית לפרטי הלקוח
    setTimeout(() => {
      const clientDetailsElement = document.querySelector('[data-client-details]');
      if (clientDetailsElement) {
        clientDetailsElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
    setViewingClient(null); // Ensure client details view is closed when opening the edit form
  };

  const handleCreateMeeting = (client) => {
    setSelectedClientForMeeting(client);
    setShowMeetingForm(true);
    
    // גלילה אוטומטית למקטע יצירת הפגישה
    setTimeout(() => {
      const meetingFormElement = document.querySelector('[data-meeting-form]');
      if (meetingFormElement) {
        meetingFormElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };

  const handleCancelMeeting = () => {
    setShowMeetingForm(false);
    setSelectedClientForMeeting(null);
  };

  const handleDelete = async (clientId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק לקוח זה?")) {
      try {
        await Client.delete(clientId);
        if (viewingClient?.id === clientId) {
          setViewingClient(null);
        }
        loadData();
      } catch (error) {
        console.error("שגיאה במחיקת לקוח:", error);
      }
    }
  };

  const handleExportClients = async () => {
    setIsExporting(true);
    toast({
        title: "מייצא לקוחות...",
        description: "תהליך הייצוא החל. אנא המתן.",
    });

    try {
        const response = await exportClients();
        const { data, headers } = response;
        
        // Create a Blob from the CSV data
        const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
        
        // Create a link to trigger the download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        // Extract filename from Content-Disposition header or set a default
        const contentDisposition = headers['content-disposition'];
        let fileName = 'clients-export.csv';
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (fileNameMatch && fileNameMatch.length === 2)
                fileName = fileNameMatch[1];
        }

        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "היצוא הושלם!",
            description: "קובץ הלקוחות הורד בהצלחה.",
            className: "bg-green-100 text-green-900 border-green-200",
        });

    } catch (error) {
        console.error("שגיאה בייצוא לקוחות:", error);
        toast({
            title: "שגיאה בייצוא",
            description: "אירעה שגיאה במהלך יצירת קובץ הלקוחות.",
            variant: "destructive",
        });
    } finally {
        setIsExporting(false);
    }
  };

  const handleDeleteAllClients = async () => {
    if (confirm("אזהרה: האם אתה בטוח שברצונך למחוק את כל הלקוחות והלידים? פעולה זו אינה הפיכה!")) {
        setIsLoading(true);
        try {
            const workspaceId = localStorage.getItem('currentWorkspaceId');
            if (!workspaceId) {
                toast({
                    title: "שגיאה",
                    description: "אין Workspace נבחר",
                    variant: "destructive",
                });
                setIsLoading(false);
                return;
            }

            const clientsToDelete = await Client.filter({ workspace_id: workspaceId });

            if (clientsToDelete.length === 0) {
                toast({
                    title: "אין לקוחות למחיקה",
                });
                setIsLoading(false);
                return;
            }

            const deletePromises = clientsToDelete.map(client => Client.delete(client.id));
            await Promise.all(deletePromises);
            
            toast({
                title: "הצלחה!",
                description: `נמחקו ${clientsToDelete.length} לקוחות.`,
                className: "bg-green-100 text-green-900 border-green-200",
            });
            
            await loadData();
            
        } catch (error) {
            console.error("שגיאה במחיקת כל הלקוחות:", error);
            toast({
                title: "שגיאה",
                description: "אירעה שגיאה במחיקת הלקוחות. נסה שוב.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }
  };


  return (
    <WorkspaceAuthGuard>
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 min-h-screen transition-all duration-500">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">ניהול לקוחות</h1>
            <p className="text-slate-600">נהל את כל הלקוחות והלידים שלך במקום אחד</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => {
                setShowForm(true);
                setEditingClient(null);
                setViewingClient(null);
              }}
              className="hidden md:flex bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg h-10 transition-all duration-300"
            >
              <Plus className="w-4 h-4" />
              <span>לקוח חדש</span>
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
                                <Upload className="ml-2 h-4 w-4" />
                                <span>ייבוא לקוחות</span>
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DropdownMenuItem onSelect={handleExportClients} disabled={isExporting}>
                            <Download className="ml-2 h-4 w-4" />
                            <span>{isExporting ? 'מייצא...' : 'יצוא לקוחות'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            onSelect={handleDeleteAllClients} 
                            disabled={isLoading}
                            className="text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <Trash2 className="ml-2 h-4 w-4" />
                            <span>מחק הכל (בדיקה)</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <ClientImportWizard 
                      onClose={() => setIsImportOpen(false)} 
                      onFinish={() => {
                        loadData(); // רענון הנתונים
                        setIsImportOpen(false); // סגירת הדיאלוג
                      }} 
                    />
                </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter & Action Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-6">
            <div className="flex items-center gap-2">
                <div className="relative flex-grow">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                    <Input
                        placeholder="חיפוש..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 w-full pr-10 bg-slate-50 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                </div>
                
                <ClientFilters filters={filters} onFiltersChange={setFilters} />

                <SortDropdown sortOption={sortOption} onSortChange={setSortOption} />

                {(searchTerm || (filters.status !== 'all') || (filters.work_stage && filters.work_stage !== 'all')) && (
                    <Button variant="ghost" onClick={handleClearFilters} size="icon" className="h-10 w-10 text-slate-600 hover:text-red-600 flex-shrink-0">
                        <X className="h-5 w-5" />
                        <span className="sr-only">נקה סינון</span>
                    </Button>
                )}
            </div>
        </div>

        {/* Status Tabs */}
        <div className="my-6">
          <ClientStatusTabs 
            activeTab={activeStatusTab}
            onTabChange={setActiveStatusTab}
            statusCounts={statusCounts}
          />
        </div>

        {/* Client Details View */}
        <AnimatePresence>
          {viewingClient && (
            <motion.div 
              data-client-details
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
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

        {/* Client Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <ClientForm
                client={editingClient}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingClient(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Meeting Form */}
        <AnimatePresence>
          {showMeetingForm && selectedClientForMeeting && (
            <motion.div 
              data-meeting-form 
              className="relative"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-end mb-4">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCancelMeeting}
                  className="bg-white hover:bg-red-50 border-red-200 text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <MeetingForm
                meeting={null}
                clients={[selectedClientForMeeting]}
                onSubmit={handleMeetingSubmit}
                onCancel={handleCancelMeeting}
                preSelectedClient={selectedClientForMeeting}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client List */}
        <motion.div 
          className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ClientList
            clients={tabFilteredClients}
            isLoading={isLoading}
            onView={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            activeTab={activeStatusTab}
          />
        </motion.div>

        {/* Floating Add Button for Mobile */}
        <Button 
          onClick={() => {
            setShowForm(true);
            setEditingClient(null);
            setViewingClient(null);
          }}
          className="md:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-all duration-300"
        >
          <Plus className="w-6 h-6 text-white" />
        </Button>
      </div>
    </div>
    </WorkspaceAuthGuard>
  );
}