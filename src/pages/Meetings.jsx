import React, { useState, useEffect } from "react";
import { Meeting } from "@/entities/Meeting";
import { Client } from "@/entities/Client";
import { User } from "@/entities/User"; // Added User import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar as CalendarIcon, List, Search } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

import MeetingForm from "../components/meetings/MeetingForm";
import MeetingCalendar from "../components/meetings/MeetingCalendar";
import MeetingList from "../components/meetings/MeetingList";

export default function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null); // Added currentUser state

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterAndSortMeetings();
  }, [meetings, searchTerm]);

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
      
      const [meetingsData, clientsData] = await Promise.all([
        Meeting.filter({ workspace_id: workspaceId }),
        Client.filter({ workspace_id: workspaceId })
      ]);
      
      const updatedMeetings = await updatePastMeetingsStatus(meetingsData);
      setMeetings(updatedMeetings);
      setClients(clientsData);
    } catch (error) {
      console.error("שגיאה בטעינת נתונים:", error);
    }
    setIsLoading(false);
  };

  const updatePastMeetingsStatus = async (meetingsData) => {
    const now = new Date();
    const updatedMeetings = [];
    
    for (const meeting of meetingsData) {
      const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
      
      if (meetingDateTime < now && meeting.status === 'scheduled') {
        try {
          await Meeting.update(meeting.id, { ...meeting, status: 'completed' });
          updatedMeetings.push({ ...meeting, status: 'completed' });
        } catch (error) {
          console.error("שגיאה בעדכון סטטוס פגישה:", error);
          updatedMeetings.push(meeting);
        }
      } else {
        updatedMeetings.push(meeting);
      }
    }
    
    return updatedMeetings;
  };

  const filterAndSortMeetings = () => {
    let filtered = meetings;

    // חיפוש לפי שם לקוח או נושא פגישה
    if (searchTerm) {
      filtered = filtered.filter(meeting => 
        meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        meeting.client_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // מיון לפי סטטוס ותאריך - פגישות מתוכננות ראשונות, לאחר מכן הושלמו
    filtered.sort((a, b) => {
      // קודם נמיין לפי סטטוס - מתוכנן לפני הושלם
      if (a.status !== b.status) {
        if (a.status === 'scheduled') return -1;
        if (b.status === 'scheduled') return 1;
      }
      
      // בתוך אותו סטטוס, נמיין לפי תאריך ושעה
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      
      // פגישות מתוכננות - הקרובות ביותר ראשונות
      if (a.status === 'scheduled' && b.status === 'scheduled') {
        return dateTimeA - dateTimeB;
      }
      
      // פגישות שהושלמו - האחרונות ראשונות
      if (a.status === 'completed' && b.status === 'completed') {
        return dateTimeB - dateTimeA;
      }
      
      return dateTimeA - dateTimeB;
    });

    setFilteredMeetings(filtered);
  };

  const handleSubmit = async (meetingData) => {
    try {
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (!workspaceId) {
        alert("שגיאה: אין Workspace נבחר");
        return;
      }

      const selectedClient = clients.find(c => c.id === meetingData.client_id);
      const dataToSave = {
        ...meetingData,
        client_email: selectedClient?.email || meetingData.client_email || "",
        created_by_email: currentUser?.email || "",
        workspace_id: workspaceId
      };

      if (editingMeeting) {
        await Meeting.update(editingMeeting.id, dataToSave);
      } else {
        await Meeting.create(dataToSave);
        
        if (currentUser?.google_calendar_connected) {
          try {
            const { createCalendarEvent } = await import('@/functions/createCalendarEvent');
            await createCalendarEvent(dataToSave);
          } catch (calendarError) {
            console.error('Error creating Google Calendar event:', calendarError);
          }
        }
      }
      setShowForm(false);
      setEditingMeeting(null);
      loadData();
    } catch (error) {
      console.error("שגיאה בשמירת פגישה:", error);
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setShowForm(true);
  };

  const handleDelete = async (meetingId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק פגישה זו?")) {
      try {
        await Meeting.delete(meetingId);
        loadData();
      } catch (error) {
        console.error("שגיאה במחיקת פגישה:", error);
      }
    }
  };

  const todayMeetings = meetings.filter(meeting => 
    format(new Date(meeting.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-6 min-h-screen rtl-text">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">ניהול פגישות</h1>
            <p className="text-slate-600">נהל את כל הפגישות שלך במקום אחד</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => {
                setShowForm(true);
                setEditingMeeting(null);
              }}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              פגישה חדשה
            </Button>
            <Button 
              variant="outline"
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="gap-2"
            >
              {viewMode === 'calendar' ? (
                <>
                  <List className="w-4 h-4" />
                  תצוגת רשימה
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4" />
                  תצוגת לוח שנה
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Search */}
        {viewMode === "list" && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="relative max-w-md">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="חיפוש לפי לקוח או נושא פגישה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
        )}

        {/* Meeting Form */}
        <AnimatePresence>
          {showForm && (
            <MeetingForm
              meeting={editingMeeting}
              clients={clients}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingMeeting(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Main Content */}
        {viewMode === "calendar" ? (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <MeetingCalendar
                meetings={meetings}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onMeetingEdit={handleEdit}
              />
            </div>
            <div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-4">
                  פגישות ביום {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
                </h3>
                {todayMeetings.length > 0 ? (
                  <div className="space-y-3">
                    {todayMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => handleEdit(meeting)}
                      >
                        <div className="font-medium text-slate-900">{meeting.title}</div>
                        <div className="text-sm text-slate-600">{meeting.client_name}</div>
                        <div className="text-sm text-slate-500">{meeting.time}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-4">אין פגישות ביום זה</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <MeetingList
              meetings={filteredMeetings}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  );
}