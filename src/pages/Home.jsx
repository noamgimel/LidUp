import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAccessAndRedirect = async () => {
      try {
        const user = await base44.auth.me();
        
        // בדיקה אם זה SystemAdmin
        const admins = await base44.entities.SystemAdmin.filter({ 
          user_email: user.email, 
          is_active: true 
        });
        
        if (admins.length > 0) {
          navigate(createPageUrl('MasterAdminDashboard'));
          return;
        }
        
        // בדיקה אם המשתמש משויך ל-Workspace פעיל
        const memberships = await base44.entities.WorkspaceMember.filter({
          user_email: user.email,
          is_active: true
        });
        
        if (memberships.length === 0) {
          navigate(createPageUrl('NoAccess'));
          return;
        }
        
        // בדיקה אם יש Workspace נבחר ב-localStorage
        let currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
        
        if (currentWorkspaceId) {
          const isValid = memberships.some(m => m.workspace_id === currentWorkspaceId);
          if (!isValid) {
            currentWorkspaceId = null;
            localStorage.removeItem('currentWorkspaceId');
          }
        }
        
        if (!currentWorkspaceId) {
          if (memberships.length === 1) {
            localStorage.setItem('currentWorkspaceId', memberships[0].workspace_id);
            navigate(createPageUrl('Dashboard'));
          } else {
            navigate(createPageUrl('SelectWorkspace'));
          }
        } else {
          navigate(createPageUrl('Dashboard'));
        }
        
      } catch (error) {
        console.error('Error checking access:', error);
        navigate(createPageUrl('NoAccess'));
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAccessAndRedirect();
  }, [navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">בודק הרשאות...</p>
        </div>
      </div>
    );
  }

  return null;
}