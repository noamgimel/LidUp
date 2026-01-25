import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    // פשוט מפנה לדשבורד - כל משתמש מחובר יכול להיכנס
    navigate(createPageUrl('Dashboard'));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">טוען...</p>
      </div>
    </div>
  );
}