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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Building2, Users, Settings } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MasterAdminDashboard() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({ name: "", notes: "" });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
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

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => base44.entities.Workspace.list(),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['all-members'],
    queryFn: () => base44.entities.WorkspaceMember.list(),
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: (data) => base44.entities.Workspace.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreateDialog(false);
      setNewWorkspace({ name: "", notes: "" });
      toast({
        title: "Workspace נוצר בהצלחה",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    },
    onError: (error) => {
      toast({
        title: "שגיאה ביצירת Workspace",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleWorkspaceMutation = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.Workspace.update(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast({
        title: "סטטוס Workspace עודכן",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    },
  });

  const getMemberCount = (workspaceId) => {
    return allMembers.filter(m => m.workspace_id === workspaceId && m.is_active).length;
  };

  const handleCreateWorkspace = () => {
    if (!newWorkspace.name.trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס שם ל-Workspace",
        variant: "destructive",
      });
      return;
    }
    createWorkspaceMutation.mutate(newWorkspace);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">לוח בקרה ראשי</h1>
            <p className="text-slate-600">ניהול Workspaces ומשתמשים</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-l from-blue-600 to-blue-700 gap-2">
                <Plus className="w-4 h-4" />
                צור Workspace חדש
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>יצירת Workspace חדש</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">שם ה-Workspace</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, name: e.target.value })}
                    placeholder="שם העסק"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">הערות (אופציונלי)</Label>
                  <Textarea
                    id="notes"
                    value={newWorkspace.notes}
                    onChange={(e) => setNewWorkspace({ ...newWorkspace, notes: e.target.value })}
                    placeholder="הערות נוספות"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    ביטול
                  </Button>
                  <Button onClick={handleCreateWorkspace}>
                    צור Workspace
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Workspaces קיימים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">טוען...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                אין Workspaces במערכת. צור את הראשון!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                    <TableHead className="text-right">מספר משתמשים</TableHead>
                    <TableHead className="text-right">תאריך יצירה</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workspaces.map((workspace) => (
                    <TableRow key={workspace.id}>
                      <TableCell className="font-medium">{workspace.name}</TableCell>
                      <TableCell>
                        <Badge variant={workspace.is_active ? "default" : "secondary"}>
                          {workspace.is_active ? "פעיל" : "לא פעיל"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-slate-500" />
                          {getMemberCount(workspace.id)}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(workspace.created_date).toLocaleDateString('he-IL')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(createPageUrl(`WorkspaceManagement?id=${workspace.id}`))}
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            נהל משתמשים
                          </Button>
                          <Button
                            size="sm"
                            variant={workspace.is_active ? "destructive" : "default"}
                            onClick={() => toggleWorkspaceMutation.mutate({ 
                              id: workspace.id, 
                              is_active: !workspace.is_active 
                            })}
                          >
                            {workspace.is_active ? "השבת" : "הפעל"}
                          </Button>
                        </div>
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