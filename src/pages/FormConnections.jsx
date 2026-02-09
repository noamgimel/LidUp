import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Link as LinkIcon, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import FormConnectionCard from "../components/forms/FormConnectionCard";
import FormConnectionForm from "../components/forms/FormConnectionForm";

export default function FormConnections() {
  const [connections, setConnections] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    filterConnections();
  }, [connections, searchTerm]);

  const checkAuthAndLoadData = async () => {
    setIsLoading(true);
    try {
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      // בדיקת הרשאות Admin
      if (user.email !== 'noam.gamliel@gmail.com') {
        setIsAuthorized(false);
        setIsLoading(false);
        toast({
          title: "גישה נדחתה",
          description: "אין לך הרשאה לצפות בעמוד זה",
          variant: "destructive",
        });
        return;
      }
      
      setIsAuthorized(true);
      
      // טעינת נתונים - Admin רואה את כל הלקוחות
      const [connectionsData, clientsData] = await Promise.all([
        base44.entities.FormConnection.list("-created_date"),
        base44.entities.Client.list()
      ]);
      
      setConnections(connectionsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error("שגיאה בטעינת נתונים:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את החיבורים",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const filterConnections = () => {
    let filtered = [...connections];

    if (searchTerm) {
      filtered = filtered.filter(conn => 
        conn.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conn.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conn.form_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredConnections(filtered);
  };

  const generateFormId = () => {
    return 'form_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  };

  const generateSecretKey = () => {
    return 'sk_' + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingConnection) {
        await base44.entities.FormConnection.update(editingConnection.id, formData);
        toast({
          title: "עודכן בהצלחה!",
          description: "החיבור עודכן במערכת",
          className: "bg-green-100 text-green-900 border-green-200",
        });
      } else {
        const formId = generateFormId();
        const secretKey = generateSecretKey();
        const webhookUrl = `${window.location.origin}/api/functions/receiveWebsiteLead`;
        
        const newConnection = {
          ...formData,
          form_id: formId,
          secret_key: secretKey,
          webhook_url: webhookUrl,
          is_active: true,
          submissions_count: 0,
          created_by: currentUser.email
        };
        
        await base44.entities.FormConnection.create(newConnection);
        toast({
          title: "נוצר בהצלחה!",
          description: "חיבור הטופס נוצר במערכת",
          className: "bg-green-100 text-green-900 border-green-200",
        });
      }
      setShowForm(false);
      setEditingConnection(null);
      await checkAuthAndLoadData();
    } catch (error) {
      console.error("שגיאה בשמירת חיבור:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לשמור את החיבור",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (connection) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const handleDelete = async (connectionId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק חיבור זה?")) {
      try {
        await base44.entities.FormConnection.delete(connectionId);
        toast({
          title: "נמחק בהצלחה!",
          description: "החיבור נמחק מהמערכת",
          className: "bg-green-100 text-green-900 border-green-200",
        });
        await checkAuthAndLoadData();
      } catch (error) {
        console.error("שגיאה במחיקת חיבור:", error);
        toast({
          title: "שגיאה",
          description: "לא ניתן למחוק את החיבור",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggle = async (connection) => {
    try {
      await base44.entities.FormConnection.update(connection.id, {
        is_active: !connection.is_active
      });
      toast({
        title: "עודכן!",
        description: `הטופס ${connection.is_active ? 'הושבת' : 'הופעל'}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      await checkAuthAndLoadData();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen flex items-center justify-center">
        <p className="text-slate-500">טוען...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">גישה נדחתה</h2>
          <p className="text-slate-600">אין לך הרשאה לצפות בעמוד זה. עמוד זה מיועד למנהלי המערכת בלבד.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 space-y-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">חיבורי טפסים</h1>
            <p className="text-slate-600">נהל טפסי השארת פרטים והתחבר לאתרים חיצוניים</p>
          </div>
          <Button 
            onClick={() => {
              setShowForm(true);
              setEditingConnection(null);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>חיבור חדש</span>
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">איך זה עובד?</p>
              <p>כל חיבור טופס מקבל מזהה ייחודי (form_id) ומפתח סודי (secret_key). כשתשלב את הקוד באתר הלקוח, כל ליד שיגיע יופיע אוטומטית במערכת תחת הלקוח המתאים.</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              <Input
                placeholder="חיפוש לפי שם טופס, לקוח או מזהה..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 w-full pr-10"
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" onClick={() => setSearchTerm("")} size="icon" className="h-10 w-10">
                <X className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FormConnectionForm
                formConnection={editingConnection}
                clients={clients}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingConnection(null);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Connections Grid */}
        {filteredConnections.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <LinkIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-2">
              {searchTerm ? "לא נמצאו חיבורים תואמים" : "עדיין אין חיבורי טפסים"}
            </p>
            {!searchTerm && (
              <Button 
                onClick={() => setShowForm(true)}
                variant="outline"
                className="mt-4"
              >
                <Plus className="ml-2 h-4 w-4" />
                צור חיבור ראשון
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredConnections.map((connection) => (
              <FormConnectionCard
                key={connection.id}
                formConnection={connection}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}