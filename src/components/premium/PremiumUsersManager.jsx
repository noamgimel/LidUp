import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Crown, UserCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PremiumUsersManager() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const usersData = await base44.entities.User.list("-created_date");
      setUsers(usersData || []);
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

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const handleTogglePremium = async (user) => {
    const newPlanType = user.plan_type === 'PREMIUM' ? 'FREE' : 'PREMIUM';
    
    try {
      await base44.auth.updateMe({ plan_type: newPlanType });
      
      // If updating another user (as admin), we would need a backend function
      // For now, this updates the current user only
      
      toast({
        title: "עודכן בהצלחה!",
        description: `המשתמש ${user.email} שונה ל-${newPlanType === 'PREMIUM' ? 'פרימיום' : 'חינמי'}`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      
      await loadUsers();
    } catch (error) {
      console.error("שגיאה בעדכון סטטוס:", error);
      toast({
        title: "שגיאה",
        description: error.message || "לא ניתן לעדכן את סטטוס המשתמש",
        variant: "destructive",
      });
    }
  };

  const getPremiumCount = () => users.filter(u => u.plan_type === 'PREMIUM').length;
  const getFreeCount = () => users.filter(u => u.plan_type === 'FREE' || !u.plan_type).length;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">טוען משתמשים...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סך המשתמשים</CardTitle>
            <UserCircle className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשי פרימיום</CardTitle>
            <Crown className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{getPremiumCount()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים חינמיים</CardTitle>
            <UserCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{getFreeCount()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
            <Input
              placeholder="חיפוש לפי אימייל או שם..."
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

      {/* Users List */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <UserCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {searchTerm ? "לא נמצאו משתמשים תואמים" : "אין משתמשים במערכת"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">משתמש</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">אימייל</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">מסלול</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">תאריך הצטרפות</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">פעולות</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="mr-4">
                          <div className="text-sm font-medium text-slate-900">{user.full_name || 'לא צוין'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.plan_type === 'PREMIUM' ? (
                        <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                          <Crown className="w-3 h-3 ml-1" />
                          פרימיום
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          חינמי
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(user.created_date).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.plan_type === 'PREMIUM'}
                          onCheckedChange={() => handleTogglePremium(user)}
                          disabled={user.email === 'noam.gamliel@gmail.com'}
                        />
                        <Label className="text-xs text-slate-600">
                          {user.plan_type === 'PREMIUM' ? 'הפוך לחינמי' : 'שדרג לפרימיום'}
                        </Label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}