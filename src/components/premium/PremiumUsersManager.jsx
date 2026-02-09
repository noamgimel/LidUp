import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Search, Crown, Users, DollarSign, X, Plus, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import FormConnectionForm from "../forms/FormConnectionForm";

export default function PremiumUsersManager() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [showFormConnectionForm, setShowFormConnectionForm] = useState(false);
  const [userConnections, setUserConnections] = useState({});
  const [clients, setClients] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const [allUsers, allClients, allConnections] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Client.list(),
        base44.entities.FormConnection.list()
      ]);
      
      // מיון: פרימיום ראשון, אחר כך חינמי
      const sortedUsers = allUsers.sort((a, b) => {
        if (a.plan_type === 'PREMIUM' && b.plan_type !== 'PREMIUM') return -1;
        if (a.plan_type !== 'PREMIUM' && b.plan_type === 'PREMIUM') return 1;
        return 0;
      });
      
      setUsers(sortedUsers);
      setClients(allClients);
      
      // ארגון חיבורים לפי created_by
      const connectionsByUser = {};
      allConnections.forEach(conn => {
        if (!connectionsByUser[conn.created_by]) {
          connectionsByUser[conn.created_by] = [];
        }
        connectionsByUser[conn.created_by].push(conn);
      });
      setUserConnections(connectionsByUser);
      
    } catch (error) {
      console.error("שגיאה בטעינת משתמשים:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת המשתמשים",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleTogglePlan = async (user) => {
    const newPlanType = user.plan_type === 'PREMIUM' ? 'FREE' : 'PREMIUM';
    
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        plan_type: newPlanType
      });
      
      toast({
        title: "עודכן בהצלחה!",
        description: `המשתמש ${user.full_name} שודרג ל${newPlanType === 'PREMIUM' ? 'פרימיום' : 'חינמי'}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      
      await loadUsers();
    } catch (error) {
      console.error("שגיאה בעדכון מסלול:", error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לעדכן את המסלול",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateFormId = () => {
    return 'form_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  };

  const generateSecretKey = () => {
    return 'sk_' + Math.random().toString(36).substr(2, 16) + Math.random().toString(36).substr(2, 16);
  };

  const handleCreateFormConnection = async (userEmail, formData) => {
    try {
      console.log("=== התחלת יצירת חיבור טופס ===");
      console.log("userEmail:", userEmail);
      console.log("formData:", formData);
      
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
        created_by: userEmail
      };
      
      console.log("newConnection לפני יצירה:", newConnection);
      
      const result = await base44.asServiceRole.entities.FormConnection.create(newConnection);
      console.log("התוצאה מהיצירה:", result);
      
      toast({
        title: "נוצר בהצלחה!",
        description: "חיבור הטופס נוצר במערכת",
        className: "bg-green-100 text-green-900 border-green-200",
      });
      
      setShowFormConnectionForm(false);
      await loadUsers();
    } catch (error) {
      console.error("=== שגיאה מפורטת ביצירת חיבור ===");
      console.error("סוג השגיאה:", error.constructor.name);
      console.error("הודעת השגיאה:", error.message);
      console.error("אובייקט השגיאה המלא:", error);
      console.error("Stack trace:", error.stack);
      
      toast({
        title: "שגיאה ביצירת חיבור",
        description: error.message || "לא ניתן ליצור חיבור טופס - פתח Console לפרטים",
        variant: "destructive",
      });
    }
  };

  const toggleUserExpanded = (userId) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setShowFormConnectionForm(false);
    } else {
      setExpandedUserId(userId);
      setShowFormConnectionForm(false);
    }
  };

  const totalUsers = users.length;
  const premiumUsers = users.filter(u => u.plan_type === 'PREMIUM').length;
  const freeUsers = users.filter(u => u.plan_type !== 'PREMIUM').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">טוען משתמשים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">סה"כ משתמשים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-slate-900">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">משתמשי פרימיום</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900">{premiumUsers}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">משתמשים חינמיים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-900">{freeUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
              <Input
                placeholder="חיפוש לפי שם או אימייל..."
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
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                      לא נמצאו משתמשים
                    </td>
                  </tr>
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleUserExpanded(user.id)}
                                  className="p-1 h-auto"
                                >
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
                              <Badge className="bg-purple-500 hover:bg-purple-600 gap-1">
                                <Crown className="w-3 h-3" />
                                פרימיום
                              </Badge>
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
                                className={isPremium 
                                  ? 'text-slate-600 hover:bg-slate-100' 
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'}
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
                                    <Button
                                      onClick={() => setShowFormConnectionForm(true)}
                                      size="sm"
                                      className="bg-blue-600 hover:bg-blue-700 gap-2"
                                    >
                                      <Plus className="w-4 h-4" />
                                      חיבור חדש
                                    </Button>
                                  )}
                                </div>
                                
                                {showFormConnectionForm && (
                                  <FormConnectionForm
                                    formConnection={null}
                                    clients={userClients}
                                    onSubmit={(formData) => handleCreateFormConnection(user.email, formData)}
                                    onCancel={() => setShowFormConnectionForm(false)}
                                  />
                                )}
                                
                                {connections.length > 0 && !showFormConnectionForm && (
                                  <div className="grid gap-3">
                                    {connections.map(conn => (
                                      <div key={conn.id} className="bg-white rounded-lg p-3 border border-slate-200">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="font-medium text-slate-900">{conn.form_name}</p>
                                            <p className="text-sm text-slate-500">{conn.client_name}</p>
                                          </div>
                                          <Badge variant={conn.is_active ? "default" : "outline"}>
                                            {conn.is_active ? "פעיל" : "לא פעיל"}
                                          </Badge>
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
    </div>
  );
}