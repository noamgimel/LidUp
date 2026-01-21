import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, UserPlus, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WorkspaceManagement() {
  const [workspaceId, setWorkspaceId] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newMember, setNewMember] = useState({ email: "", role: "member" });
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setWorkspaceId(id);
    }

    const checkAuth = async () => {
      try {
        const user = await base44.auth.me();
        const admins = await base44.entities.SystemAdmin.filter({ 
          user_email: user.email, 
          is_active: true 
        });
        
        if (admins.length === 0) {
          navigate(createPageUrl('NoAccess'));
          return;
        }
        
        setIsSystemAdmin(true);
        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate(createPageUrl('NoAccess'));
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, [navigate]);

  const { data: workspace } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => base44.entities.Workspace.filter({ id: workspaceId }).then(res => res[0]),
    enabled: !!workspaceId,
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId }),
    enabled: !!workspaceId,
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkspaceMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      setShowAddDialog(false);
      setNewMember({ email: "", role: "member" });
      toast({
        title: "משתמש נוסף בהצלחה",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה בהוספת משתמש",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleMemberMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.WorkspaceMember.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({
        title: "סטטוס משתמש עודכן",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.WorkspaceMember.update(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast({
        title: "תפקיד עודכן בהצלחה",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    },
  });

  const handleAddMember = () => {
    if (!newMember.email.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס כתובת אימייל",
        variant: "destructive",
      });
      return;
    }

    const exists = members.some(m => m.user_email === newMember.email && m.is_active);
    if (exists) {
      toast({
        title: "שגיאה",
        description: "משתמש זה כבר קיים ב-Workspace",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      workspace_id: workspaceId,
      user_email: newMember.email,
      role: newMember.role,
    });
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">לא נבחר Workspace</p>
          <Button onClick={() => navigate(createPageUrl('MasterAdminDashboard'))}>
            חזור ללוח הבקרה
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('MasterAdminDashboard'))}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ניהול משתמשים</h1>
            {workspace && <p className="text-slate-600">{workspace.name}</p>}
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                משתמשי ה-Workspace
              </CardTitle>
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-l from-green-600 to-green-700 gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף משתמש
                  </Button>
                </DialogTrigger>
                <DialogContent dir="rtl">
                  <DialogHeader>
                    <DialogTitle>הוספת משתמש ל-Workspace</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">כתובת אימייל</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMember.email}
                        onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">תפקיד</Label>
                      <Select 
                        value={newMember.role} 
                        onValueChange={(value) => setNewMember({ ...newMember, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="owner">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                        ביטול
                      </Button>
                      <Button onClick={handleAddMember}>
                        הוסף משתמש
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">טוען...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                אין משתמשים ב-Workspace זה. הוסף את הראשון!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">תאריך הצטרפות</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.user_email}</TableCell>
                      <TableCell>
                        {isSystemAdmin ? (
                          <Select
                            value={member.role}
                            onValueChange={(value) => updateRoleMutation.mutate({ id: member.id, role: value })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="owner">Owner</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.is_active ? "default" : "secondary"}>
                          {member.is_active ? "פעיל" : "לא פעיל"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(member.created_date).toLocaleDateString('he-IL')}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={member.is_active ? "destructive" : "default"}
                          onClick={() => toggleMemberMutation.mutate({ 
                            id: member.id, 
                            is_active: !member.is_active 
                          })}
                        >
                          {member.is_active ? "השבת" : "הפעל"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}