import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as AuthUser } from "@/entities/User";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Menu,
  X,
  BarChart,
  TrendingUp,
  LogOut,
  UserCircle,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";


const navigationItems = [
  {
    title: "דשבורד",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "לקוחות",
    url: createPageUrl("Clients"),
    icon: Users,
  },
  {
    title: "פגישות",
    url: createPageUrl("Meetings"),
    icon: Calendar,
  },
  {
    title: "דוחות ואנליטיקה",
    url: createPageUrl("Reports"),
    icon: BarChart,
  },
  {
    title: "אינטגרציות (בטא)", // Changed title here
    url: createPageUrl("Integrations"),
    icon: TrendingUp,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  // בדיקה אם אנחנו בדף שלא צריך סיידבר
  const pagesWithoutSidebar = ['NoAccess', 'SelectWorkspace', 'MasterAdminDashboard', 'WorkspaceManagement', 'Home'];
  const shouldShowSidebar = !pagesWithoutSidebar.includes(currentPageName);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await AuthUser.me();
        setUser(currentUser);
      } catch (error) {
        console.error("User not logged in or error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await AuthUser.logout();
    window.location.reload(); // Refresh to go to login page
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0].charAt(0) + names[names.length - 1].charAt(0);
    }
    return name.charAt(0);
  };

  return (
    <div dir="rtl" className="font-['Heebo',sans-serif] min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');

          * {
            font-family: 'Heebo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .rtl-text {
            text-align: right;
            direction: rtl;
          }

          input, textarea, select, button {
            text-align: right !important;
            direction: rtl !important;
          }

          .table-rtl th, .table-rtl td {
            text-align: right !important;
          }

          .custom-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 18rem;
            z-index: 50;
            transform: translateX(0);
            transition: transform 0.3s ease-in-out;
          }

          .main-content-wrapper {
            min-height: 100vh;
            transition: padding-right 0.3s ease-in-out;
          }

          @media (min-width: 768px) {
            .main-content-wrapper {
              padding-right: 18rem;
            }
          }

          @media (max-width: 767px) {
            .custom-sidebar {
              width: 20rem;
            }

            .custom-sidebar.mobile-hidden {
              transform: translateX(100%);
            }

            .main-content-wrapper {
              padding-right: 0;
            }

            .mobile-overlay {
              position: fixed;
              inset: 0;
              background-color: rgba(0, 0, 0, 0.5);
              z-index: 40;
            }
          }
        `}
      </style>

      <div className="rtl-text">
        {shouldShowSidebar && sidebarOpen && (
          <div
            className="mobile-overlay md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {shouldShowSidebar && (
          <aside className={`custom-sidebar bg-white/95 backdrop-blur-sm border-l border-slate-200 shadow-xl ${!sidebarOpen ? 'mobile-hidden md:block' : 'block'}`}>
          <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/233c624f0_.png" alt="לידUp לוגו" className="h-9" />
                  <div className="text-right">
                    <h2 className="font-bold text-lg text-slate-900">לידUp</h2>
                    <p className="text-xs text-slate-500">ניהול לקוחות חכם</p>
                  </div>
                </div>
                <button
                  className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider px-2 py-3 text-right text-slate-500">
                  ניווט ראשי
                </h3>
                <nav className="space-y-2">
                  {navigationItems.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-right w-full ${
                        location.pathname === item.url
                          ? 'bg-gradient-to-l from-blue-600 to-blue-700 text-white shadow-md'
                          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium flex-1">{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            <div className="border-t p-4 border-slate-200">
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full">
                  {user ? (
                    <div className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-blue-600 text-white font-semibold">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-2">
                       <Skeleton className="h-10 w-10 rounded-full" />
                       <div className="space-y-2">
                         <Skeleton className="h-4 w-[100px]" />
                         <Skeleton className="h-3 w-[150px]" />
                       </div>
                    </div>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56" dir="rtl">
                   <DropdownMenuItem disabled>
                      <UserCircle className="w-4 h-4 ml-2" />
                      <span>הפרופיל שלי</span>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator />
                   <Link to={createPageUrl("Settings")}>
                     <DropdownMenuItem>
                       <Settings className="w-4 h-4 ml-2" />
                       <span>הגדרות מערכת</span>
                     </DropdownMenuItem>
                   </Link>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                     <LogOut className="w-4 h-4 ml-2" />
                     <span>התנתקות</span>
                   </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>
        )}

        {shouldShowSidebar && (
          <header className="md:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-30 h-16">
          <div className="p-4 h-full flex items-center">
            <button
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 text-slate-800" />
            </button>
          </div>
        </header>
        )}

        <main className={shouldShowSidebar ? "main-content-wrapper pt-16 md:pt-0" : "min-h-screen"}>
            {children}
        </main>
        <Toaster />
      </div>
    </div>
  );
}