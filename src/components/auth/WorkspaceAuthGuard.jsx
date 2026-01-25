import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function WorkspaceAuthGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await base44.auth.me();
        
        // בדיקה אם זה SystemAdmin
        const admins = await base44.entities.SystemAdmin.filter({
          user_email: user.email,
          is_active: true
        });
        const isSystemAdmin = admins.length > 0;
        
        if (isSystemAdmin) {
          // אם זה SystemAdmin ולא במסך Master Admin Dashboard, נווט אליו
          if (!location.pathname.includes('MasterAdminDashboard') && 
              !location.pathname.includes('WorkspaceManagement')) {
            navigate(createPageUrl('MasterAdminDashboard'));
            return;
          }
          setHasAccess(true);
          setIsChecking(false);
          return;
        }
        
        // בדיקה אם המשתמש משויך ל-Workspace פעיל
        const memberships = await base44.entities.WorkspaceMember.filter({
          user_email: user.email,
          is_active: true
        });
        
        if (memberships.length === 0) {
          // אין למשתמש גישה לאף Workspace
          navigate(createPageUrl('NoAccess'));
          return;
        }
        
        // בדיקה אם יש Workspace נבחר ב-localStorage
        let currentWorkspaceId = localStorage.getItem('currentWorkspaceId');
        
        // וידוא שה-Workspace הנבחר עדיין תקף ופעיל
        if (currentWorkspaceId) {
          const isValid = memberships.some(m => m.workspace_id === currentWorkspaceId);
          if (!isValid) {
            currentWorkspaceId = null;
            localStorage.removeItem('currentWorkspaceId');
          }
        }
        
        // אם אין Workspace נבחר
        if (!currentWorkspaceId) {
          if (memberships.length === 1) {
            // רק Workspace אחד - בחר אותו אוטומטית
            localStorage.setItem('currentWorkspaceId', memberships[0].workspace_id);
            setHasAccess(true);
          } else {
            // יותר מ-Workspace אחד - נווט למסך בחירה
            navigate(createPageUrl('SelectWorkspace'));
            return;
          }
        } else {
          setHasAccess(true);
        }
        
        setIsChecking(false);
        
      } catch (error) {
        console.error('Error checking access:', error);
        navigate(createPageUrl('NoAccess'));
      }
    };
    
    checkAccess();
  }, [navigate, location]);

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

  return hasAccess ? children : null;
}