import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Link as LinkIcon, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import FormConnectionCard from "../forms/FormConnectionCard";
import FormConnectionForm from "../forms/FormConnectionForm";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FormConnectionsManager() {
  const [connections, setConnections] = useState([]);
  const [premiumUsers, setPremiumUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterConnections();
  }, [connections, searchTerm]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [connectionsData, usersData, clientsData] = await Promise.all([
        base44.entities.FormConnection.list("-created_date"),
        base44.entities.User.list(),
        base44.entities.Client.list()
      ]);
      
      setConnections(connectionsData || []);
      setPremiumUsers(usersData.filter(u => u.plan_type === 'PREMIUM') || []);
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
      // בדיקה שהלקוח שייך למשתמש Premium
      const client = clients.find(c => c.id === formData.client_id);
      if (!client) {
        toast({
          title: "שגיאה",
          description: "לקוח לא נמצא",
          variant: "destructive",
        });
        return;
      }

      const clientOwner = premiumUsers.find(u => u.email === client.created_by);
      if (!clientOwner) {
        toast({
          title: "שגיאה",
          description: "הלקוח לא שייך למשתמש פרימיום. יש לשדרג את המשתמש לפרימיום תחילה.",
          variant: "destructive",
        });
        return;
      }

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
          created_by: 'noam.gamliel@gmail.com'
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
      await loadData();
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
        await loadData();
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
      await loadData();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
    }
  };

  // סינון לקוחות - רק של משתמשי Premium
  const premiumClients = clients.filter(client => 
    premiumUsers.some(user => user.email === client.created_by)
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">טוען חיבורים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {premiumUsers.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>אין משתמשי פרימיום</AlertTitle>
          <AlertDescription>
            כדי ליצור חיבורי טפסים, תחילה יש לשדרג משתמשים לפרימיום בלשונית "משתמשים".
          </AlertDescription>
        </Alert>
      )}

      {premiumClients.length === 0 && premiumUsers.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>אין לקוחות למשתמשי פרימיום</AlertTitle>
          <AlertDescription>
            כדי ליצור חיבורי טפסים, המשתמשים הפרימיום צריכים ליצור לקוחות תחילה.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">חיבורי טפסים</h2>
          <p className="text-sm text-slate-600">רק למשתמשי פרימיום</p>
        </div>
        <Button 
          onClick={() => {
            setShowForm(true);
            setEditingConnection(null);
          }}
          disabled={premiumClients.length === 0}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>חיבור חדש</span>
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
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
              clients={premiumClients}
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
          {!searchTerm && premiumClients.length > 0 && (
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
  );
}