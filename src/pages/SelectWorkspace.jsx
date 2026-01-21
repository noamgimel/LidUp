import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SelectWorkspace() {
  const [userEmail, setUserEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setUserEmail(user.email);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['user-memberships', userEmail],
    queryFn: async () => {
      const members = await base44.entities.WorkspaceMember.filter({ 
        user_email: userEmail,
        is_active: true 
      });
      
      const workspaceIds = members.map(m => m.workspace_id);
      const workspaces = [];
      
      for (const id of workspaceIds) {
        const ws = await base44.entities.Workspace.filter({ id, is_active: true });
        if (ws.length > 0) {
          workspaces.push({ ...ws[0], membershipId: members.find(m => m.workspace_id === id).id });
        }
      }
      
      return workspaces;
    },
    enabled: !!userEmail,
  });

  const handleSelectWorkspace = (workspaceId) => {
    localStorage.setItem('currentWorkspaceId', workspaceId);
    navigate(createPageUrl('Dashboard'));
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">טוען...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-center text-2xl">בחר Workspace</CardTitle>
          <p className="text-center text-slate-600 mt-2">
            אתה משויך למספר Workspaces. בחר את הסביבה בה ברצונך לעבוד.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {memberships.map((workspace) => (
              <Button
                key={workspace.id}
                variant="outline"
                className="h-auto p-6 justify-start hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleSelectWorkspace(workspace.id)}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 text-right">
                    <h3 className="font-semibold text-lg">{workspace.name}</h3>
                    {workspace.notes && (
                      <p className="text-sm text-slate-500 mt-1">{workspace.notes}</p>
                    )}
                  </div>
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}