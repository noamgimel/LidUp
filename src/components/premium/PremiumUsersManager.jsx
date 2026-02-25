import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Search, Crown, Users, DollarSign, X, Plus, ChevronDown, ChevronUp, Link as LinkIcon, Trash2, Edit, FileText, Copy, Check, Globe, FlaskConical } from "lucide-react";
import FormConnectionForm from "../forms/FormConnectionForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRODUCTION_BASE_URL = 'https://lidup.co.il';
const PREVIEW_BASE_URL = 'https://preview--lid-up-08cf2617.base44.app';
const WEBHOOK_PATH = '/api/functions/receiveWebsiteLead';

const isPreview = window.location.hostname.includes('preview') || window.location.hostname.includes('localhost');

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1 text-xs">
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
      {copied ? 'הועתק!' : label}
    </Button>
  );
}

export default function PremiumUsersManager() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [showFormConnectionForm, setShowFormConnectionForm] = useState(false);
  const [userConnections, setUserConnections] = useState({});
  const [clients, setClients] = useState([]);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, connection: null });
  const [editingConnection, setEditingConnection] = useState(null);
  const [instructionsDialog, setInstructionsDialog] = useState({ open: false, connection: null });
  const [leadSearchId, setLeadSearchId] = useState("");
  const [leadSearchResult, setLeadSearchResult] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const connectionsResponse = await base44.functions.invoke('getFormConnectionsForAdmin');
      const allConnections = connectionsResponse.data?.ok ? connectionsResponse.data.connections : [];
      
      const [allUsers, allClients] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Client.list()
      ]);
      
      const sortedUsers = allUsers.sort((a, b) => {
        if (a.plan_type === 'PREMIUM' && b.plan_type !== 'PREMIUM') return -1;
        if (a.plan_type !== 'PREMIUM' && b.plan_type === 'PREMIUM') return 1;
        return 0;
      });
      
      setUsers(sortedUsers);
      setClients(allClients);
      
      const connectionsByUser = {};
      allConnections.forEach(conn => {
        const ownerEmail = conn.owner_email || conn.created_by;
        if (!connectionsByUser[ownerEmail]) connectionsByUser[ownerEmail] = [];
        connectionsByUser[ownerEmail].push(conn);
      });
      setUserConnections(connectionsByUser);
      
    } catch (error) {
      console.error("שגיאה בטעינת משתמשים:", error);
      toast({ title: "שגיאה", description: "לא ניתן לטעון את רשימת המשתמשים", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleTogglePlan = async (user) => {
    const newPlanType = user.plan_type === 'PREMIUM' ? 'FREE' : 'PREMIUM';
    try {
      const response = await base44.functions.invoke('updateUserPlanType', {
        user_email: user.email,
        plan_type: newPlanType
      });
      if (!response.data.ok) throw new Error(response.data.message || "שגיאה לא ידועה");
      toast({
        title: "✅ עודכן בהצלחה!",
        description: `המשתמש ${user.full_name} עבר ל${newPlanType === 'PREMIUM' ? 'פרימיום' : 'חינמי'}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      await loadUsers();
    } catch (error) {
      toast({ title: "שגיאה בעדכון מסלול", description: error.message, variant: "destructive", duration: 10000 });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateFormConnection = async (userEmail, formData) => {
    try {
      const existingConnections = userConnections[userEmail] || [];
      const duplicateName = existingConnections.find(conn => 
        conn.form_name.toLowerCase() === formData.form_name.toLowerCase()
      );
      if (duplicateName) {
        toast({ title: "שם טופס קיים כבר", description: `כבר קיים טופס בשם "${formData.form_name}" עבור משתמש זה`, variant: "destructive" });
        return;
      }
      
      const payload = {
        userEmail,
        form_name: formData.form_name,
        platform_type: formData.platform_type,
        notes: formData.notes || "",
        ...(formData.client_id && { client_id: formData.client_id, client_name: formData.client_name })
      };
      
      const response = await base44.functions.invoke('createFormConnectionForUser', payload);
      if (!response.data.ok) throw new Error(response.data.message || "שגיאה לא ידועה");
      
      toast({
        title: "✅ נוצר בהצלחה!",
        description: `חיבור "${formData.form_name}" נוצר עבור ${userEmail}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      setShowFormConnectionForm(false);
      await loadUsers();
    } catch (error) {
      toast({ title: "שגיאה ביצירת חיבור", description: error.message, variant: "destructive", duration: 10000 });
    }
  };

  const toggleUserExpanded = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setShowFormConnectionForm(false);
      setEditingConnection(null);
    } else {
      setExpandedUserId(userId);
      setShowFormConnectionForm(false);
      setEditingConnection(null);
    }
  };

  const handleDeleteConnection = async () => {
    try {
      await base44.entities.FormConnection.delete(deleteDialog.connection.id);
      toast({ title: "✅ נמחק בהצלחה!", description: `החיבור "${deleteDialog.connection.form_name}" נמחק`, className: "bg-green-100 text-green-900 border-green-200" });
      setDeleteDialog({ open: false, connection: null });
      await loadUsers();
    } catch (error) {
      toast({ title: "שגיאה במחיקת חיבור", description: error.message, variant: "destructive" });
    }
  };

  const handleEditConnection = async (userEmail, formData) => {
    try {
      const existingConnections = userConnections[userEmail] || [];
      const duplicateName = existingConnections.find(conn => 
        conn.id !== editingConnection.id && 
        conn.form_name.toLowerCase() === formData.form_name.toLowerCase()
      );
      if (duplicateName) {
        toast({ title: "שם טופס קיים כבר", description: `כבר קיים טופס אחר בשם "${formData.form_name}"`, variant: "destructive" });
        return;
      }
      await base44.entities.FormConnection.update(editingConnection.id, formData);
      toast({ title: "✅ עודכן בהצלחה!", description: `החיבור "${formData.form_name}" עודכן`, className: "bg-green-100 text-green-900 border-green-200" });
      setEditingConnection(null);
      setShowFormConnectionForm(false);
      await loadUsers();
    } catch (error) {
      toast({ title: "שגיאה בעדכון חיבור", description: error.message, variant: "destructive" });
    }
  };

  const handleSearchLeadById = async () => {
    if (!leadSearchId.trim()) {
      toast({ title: "שגיאה", description: "נא להזין Lead ID", variant: "destructive" });
      return;
    }
    try {
      const response = await base44.functions.invoke('searchLeadById', { lead_id: leadSearchId.trim() });
      if (response.data.ok && response.data.lead) {
        setLeadSearchResult(response.data.lead);
        toast({ title: "נמצא!", description: `ליד ${response.data.lead.name} נמצא במערכת`, className: "bg-green-100 text-green-900 border-green-200" });
      } else {
        setLeadSearchResult(null);
        const msg = response.data?.message || "לא נמצא ליד עם המזהה שהוזן";
        toast({ title: "לא נמצא", description: msg, variant: "destructive" });
      }
    } catch (error) {
      setLeadSearchResult(null);
      // טיפול ב-404 ובשגיאות אחרות בצורה ידידותית
      const status = error?.response?.status;
      if (status === 404) {
        toast({ title: "לא נמצא", description: "לא נמצא ליד עם המזהה שהוזן", variant: "destructive" });
      } else {
        toast({ title: "שגיאה בחיפוש", description: error.message, variant: "destructive" });
      }
    }
  };

  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.plan_type === 'PREMIUM').length;
  const freeUsers = users.filter(u => u.plan_type !== 'PREMIUM').length;

  // Webhook URLs לדיאלוג ההוראות
  const conn = instructionsDialog.connection;
  const productionWebhookUrl = `${PRODUCTION_BASE_URL}${WEBHOOK_PATH}`;
  const previewWebhookUrl = `${PREVIEW_BASE_URL}${WEBHOOK_PATH}`;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><p className="text-slate-500">טוען משתמשים...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Environment Indicator */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isPreview ? 'bg-yellow-50 border border-yellow-300 text-yellow-800' : 'bg-green-50 border border-green-300 text-green-800'}`}>
        {isPreview ? <FlaskConical className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
        <span>סביבה: {isPreview ? '⚠️ Preview (בדיקות בלבד)' : '✅ Production (lidup.co.il)'}</span>
        {isPreview && <span className="text-xs text-yellow-600">— לידים שיישלחו מכאן יגיעו לסביבת Preview, לא Production!</span>}
      </div>

      {/* Lead Search Tool */}
      <Card>
        <CardHeader>
          <CardTitle>חיפוש ליד לפי ID</CardTitle>
          <CardDescription>כלי לאיתור לידים במערכת</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="הזן Lead ID..."
              value={leadSearchId}
              onChange={(e) => setLeadSearchId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearchLeadById()}
            />
            <Button onClick={handleSearchLeadById}>
              <Search className="w-4 h-4 mr-2" />
              חפש
            </Button>
          </div>
          {leadSearchResult && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold mb-2">פרטי הליד:</h4>
              <div className="space-y-1 text-sm">
                <p><strong>ID:</strong> {leadSearchResult.id}</p>
                <p><strong>שם:</strong> {leadSearchResult.name}</p>
                <p><strong>אימייל:</strong> {leadSearchResult.email}</p>
                <p><strong>owner_email:</strong> {leadSearchResult.owner_email || 'לא מוגדר'}</p>
                <p><strong>created_by:</strong> {leadSearchResult.created_by}</p>
                <p><strong>סטטוס:</strong> {leadSearchResult.status}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">סה"כ משתמשים</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /><span className="text-2xl font-bold text-slate-900">{totalUsers}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">משתמשי פרימיום</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><Crown className="w-5 h-5 text-purple-600" /><span className="text-2xl font-bold text-purple-900">{premiumUsers}</span></div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-600">משתמשים חינמיים</CardTitle></CardHeader>
          <CardContent><div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /><span className="text-2xl font-bold text-green-900">{freeUsers}</span></div></CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              <Input placeholder="חיפוש לפי שם או אימייל..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-10 w-full pr-10" />
            </div>
            {searchTerm && <Button variant="ghost" onClick={() => setSearchTerm("")} size="icon" className="h-10 w-10"><X className="h-5 w-5" /></Button>}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת משתמשים</CardTitle>
          <CardDescription>נהל את המסלולים והחיבורים של המשתמשים</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-rtl">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">משתמש</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">מסלול</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">לא נמצאו משתמשים</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isExpanded = expandedUserId === user.id;
                    const isPremium = user.plan_type === 'PREMIUM';
                    const userClients = clients.filter(c => c.created_by === user.email);
                    const connections = userConnections[user.email] || [];
                    
                    return (
                      <React.Fragment key={user.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 border-b">
                            <div className="flex items-center gap-3">
                              {isPremium && (
                                <Button variant="ghost" size="sm" onClick={() => toggleUserExpanded(user.id)} className="p-1 h-auto">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              )}
                              <div>
                                <p className="font-medium text-slate-900">{user.full_name}</p>
                                <p className="text-sm text-slate-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 border-b text-center">
                            {user.email === 'noam.gamliel@gmail.com' ? (
                              <Badge className="bg-red-500 hover:bg-red-600">Admin</Badge>
                            ) : isPremium ? (
                              <Badge className="bg-purple-500 hover:bg-purple-600 gap-1"><Crown className="w-3 h-3" />פרימיום</Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-600">חינמי</Badge>
                            )}
                          </td>
                          <td className="px-4 py-4 border-b text-center">
                            {user.email !== 'noam.gamliel@gmail.com' && (
                              <Button
                                onClick={() => handleTogglePlan(user)}
                                variant={isPremium ? 'outline' : 'default'}
                                size="sm"
                                className={isPremium ? 'text-slate-600 hover:bg-slate-100' : 'bg-purple-600 hover:bg-purple-700 text-white'}
                              >
                                {isPremium ? 'שנמוך לחינמי' : 'שדרג לפרימיום'}
                              </Button>
                            )}
                          </td>
                        </tr>
                        
                        {isExpanded && isPremium && (
                          <tr>
                            <td colSpan="3" className="px-4 py-4 bg-purple-50 border-b">
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                    <LinkIcon className="w-4 h-4" />
                                    חיבורי טפסים ({connections.length})
                                  </h4>
                                  {!showFormConnectionForm && (
                                    <Button onClick={() => setShowFormConnectionForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2">
                                      <Plus className="w-4 h-4" />חיבור חדש
                                    </Button>
                                  )}
                                </div>
                                
                                {showFormConnectionForm && (
                                  <FormConnectionForm
                                    formConnection={editingConnection}
                                    clients={userClients}
                                    onSubmit={(formData) => editingConnection 
                                      ? handleEditConnection(user.email, formData)
                                      : handleCreateFormConnection(user.email, formData)
                                    }
                                    onCancel={() => { setShowFormConnectionForm(false); setEditingConnection(null); }}
                                  />
                                )}
                                
                                {connections.length > 0 && !showFormConnectionForm && (
                                  <div className="grid gap-3">
                                    {connections.map(conn => (
                                      <div key={conn.id} className="bg-white rounded-lg p-4 border border-slate-200">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-grow">
                                            <p className="font-medium text-slate-900">{conn.form_name}</p>
                                            {conn.client_name && <p className="text-sm text-slate-500">{conn.client_name}</p>}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge variant={conn.is_active ? "default" : "outline"} className={conn.is_active ? "bg-green-500 hover:bg-green-600" : ""}>
                                              {conn.is_active ? "פעיל" : "לא פעיל"}
                                            </Badge>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setInstructionsDialog({ open: true, connection: conn })}>
                                              <FileText className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingConnection(conn); setShowFormConnectionForm(true); }}>
                                              <Edit className="w-4 h-4 text-slate-600" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteDialog({ open: true, connection: conn })}>
                                              <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {connections.length === 0 && !showFormConnectionForm && (
                                  <div className="text-center py-6 text-slate-500">
                                    <LinkIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">עדיין אין חיבורי טפסים למשתמש זה</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, connection: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו תמחק לצמיתות את החיבור "{deleteDialog.connection?.form_name}". לא ניתן לשחזר את הפעולה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConnection} className="bg-red-600 hover:bg-red-700">מחק חיבור</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instructions Dialog */}
      <Dialog open={instructionsDialog.open} onOpenChange={(open) => !open && setInstructionsDialog({ open: false, connection: null })}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>הוראות התקנה — {conn?.form_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-right">

            {/* Production Webhook - PRIMARY */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-green-700" />
                <h3 className="font-semibold text-green-800">Webhook URL — Production ✅</h3>
                <Badge className="bg-green-600 text-white text-xs">השתמש בזה!</Badge>
              </div>
              <code className="block bg-white border border-green-200 p-2 rounded text-xs mt-1 break-all text-green-900">
                {productionWebhookUrl}
              </code>
              <div className="mt-2">
                <CopyButton text={productionWebhookUrl} label="העתק Production Webhook" />
              </div>
            </div>

            {/* Preview Webhook - SECONDARY */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-4 h-4 text-yellow-700" />
                <h3 className="font-semibold text-yellow-800">Webhook URL — Preview ⚠️</h3>
                <Badge className="bg-yellow-500 text-white text-xs">לבדיקות בלבד</Badge>
              </div>
              <code className="block bg-white border border-yellow-200 p-2 rounded text-xs mt-1 break-all text-yellow-900">
                {previewWebhookUrl}
              </code>
              <div className="mt-2">
                <CopyButton text={previewWebhookUrl} label="העתק Preview Webhook" />
              </div>
              <p className="text-xs text-yellow-700 mt-2">⚠️ לידים שיישלחו לכאן יגיעו לסביבת Preview בלבד ולא יופיעו ב-Production!</p>
            </div>

            {/* Secret Key */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-1">Secret Key:</p>
              <code className="block bg-white border p-2 rounded text-xs mt-1 break-all">{conn?.secret_key}</code>
              <div className="mt-2">
                <CopyButton text={conn?.secret_key || ''} label="העתק Secret Key" />
              </div>
            </div>

            {/* Form ID */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-1">Form ID:</p>
              <code className="block bg-white border p-2 rounded text-xs mt-1">{conn?.form_id}</code>
              <div className="mt-2">
                <CopyButton text={conn?.form_id || ''} label="העתק Form ID" />
              </div>
            </div>

            {/* Platform */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700">פלטפורמה: <span className="font-bold">{conn?.platform_type}</span></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}