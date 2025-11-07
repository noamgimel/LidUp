
import React, { useState, useEffect } from "react";
import { UserCustomStatuses } from "@/entities/UserCustomStatuses";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Settings, Palette, Save, X, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_STATUSES = [
  { id: "lead", label: "ליד", base_status: "lead", color: "yellow", order: 1 },
  { id: "hot_lead", label: "ליד חם", base_status: "hot_lead", color: "orange", order: 2 },
  { id: "client", label: "לקוח", base_status: "client", color: "green", order: 3 },
  { id: "inactive", label: "לא פעיל", base_status: "inactive", color: "gray", order: 4 }
];

const COLOR_OPTIONS = [
  { value: "blue", label: "כחול", class: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "green", label: "ירוק", class: "bg-green-100 text-green-800 border-green-200" },
  { value: "yellow", label: "צהוב", class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "orange", label: "כתום", class: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "red", label: "אדום", class: "bg-red-100 text-red-800 border-red-200" },
  { value: "purple", label: "סגול", class: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "pink", label: "ורוד", class: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "gray", label: "אפור", class: "bg-gray-100 text-gray-800 border-gray-200" }
];

const BASE_STATUS_OPTIONS = [
  { value: "lead", label: "ליד" },
  { value: "hot_lead", label: "ליד חם" },
  { value: "client", label: "לקוח" },
  { value: "inactive", label: "לא פעיל" },
  { value: "custom", label: "מותאם אישית" }
];

export default function StatusManager() {
  const { toast } = useToast();
  const [userStatuses, setUserStatuses] = useState(DEFAULT_STATUSES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [formData, setFormData] = useState({
    label: "",
    base_status: "lead",
    color: "blue"
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserStatuses();
  }, []);

  const loadUserStatuses = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      const customStatuses = await UserCustomStatuses.filter({ user_email: user.email });

      if (customStatuses.length > 0) {
        setUserStatuses(customStatuses[0].custom_statuses);
      } else {
        setUserStatuses(DEFAULT_STATUSES);
      }
    } catch (error) {
      console.error("שגיאה בטעינת סטטוסים:", error);
      setUserStatuses(DEFAULT_STATUSES);
    }
    setIsLoading(false);
  };

  const saveUserStatuses = async (statuses) => {
    try {
      const existingRecord = await UserCustomStatuses.filter({ user_email: currentUser.email });

      const statusData = {
        user_email: currentUser.email,
        custom_statuses: statuses
      };

      if (existingRecord.length > 0) {
        await UserCustomStatuses.update(existingRecord[0].id, statusData);
      } else {
        await UserCustomStatuses.create(statusData);
      }
    } catch (error) {
      console.error("שגיאה בשמירת סטטוסים:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let newStatuses;

    if (editingStatus) {
      newStatuses = userStatuses.map(status =>
        status.id === editingStatus.id
          ? { ...status, ...formData }
          : status
      );
    } else {
      const newStatus = {
        id: `custom_${Date.now()}`,
        ...formData,
        order: userStatuses.length + 1,
        is_active: true
      };
      newStatuses = [...userStatuses, newStatus];
    }

    setUserStatuses(newStatuses);
    await saveUserStatuses(newStatuses);

    toast({
      title: "הצלחה!",
      description: "הסטטוסים עודכנו בהצלחה.",
      className: "bg-green-100 text-green-900 border-green-200",
    });

    setIsDialogOpen(false);
    setEditingStatus(null);
    setFormData({ label: "", base_status: "lead", color: "blue" });
  };

  const handleEdit = (status) => {
    setEditingStatus(status);
    setFormData({
      label: status.label,
      base_status: status.base_status,
      color: status.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (statusId) => {
    if (confirm("האם אתה בטוח שברצונך למחוק סטטוס זה?")) {
      const newStatuses = userStatuses.filter(status => status.id !== statusId);
      setUserStatuses(newStatuses);
      await saveUserStatuses(newStatuses);
      toast({
        title: "סטטוס נמחק",
        description: "הסטטוס הוסר בהצלחה מהרשימה.",
        className: "bg-green-100 text-green-900 border-green-200",
      });
    }
  };

  const resetToDefaults = async () => {
    if (confirm("האם אתה בטוח שברצונך לאפס את כל הסטטוסים לברירת המחדל?")) {
      setUserStatuses(DEFAULT_STATUSES);
      await saveUserStatuses(DEFAULT_STATUSES);
      toast({
        title: "איפוס הושלם",
        description: "הסטטוסים אופסו לברירת המחדל של המערכת.",
        className: "bg-blue-100 text-blue-900 border-blue-200",
      });
    }
  };

  const getStatusColorClass = (color) => {
    return COLOR_OPTIONS.find(c => c.value === color)?.class || "bg-gray-100 text-gray-800 border-gray-200";
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="space-y-2">
              <div className="h-8 bg-slate-200 rounded"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-3 md:pb-4 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <Settings className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            ניהול סטטוסי לקוחות
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-2 md:space-y-3">
          <AnimatePresence>
            {userStatuses.map((status, index) => (
              <motion.div
                key={status.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Badge className={`${getStatusColorClass(status.color)} border text-xs whitespace-nowrap`}>
                    {status.label}
                  </Badge>
                  <span className="text-xs md:text-sm text-slate-500 truncate">
                    ({BASE_STATUS_OPTIONS.find(opt => opt.value === status.base_status)?.label})
                  </span>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(status)}
                    className="h-6 w-6 md:h-8 md:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  {!DEFAULT_STATUSES.find(ds => ds.id === status.id) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(status.id)}
                      className="h-6 w-6 md:h-8 md:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {userStatuses.length === 0 && (
          <div className="text-center py-6 md:py-8 text-slate-500">
            <Settings className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">אין סטטוסים מוגדרים</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 md:p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 gap-2 w-full sm:flex-1"
                  onClick={() => {
                    setEditingStatus(null);
                    setFormData({ label: "", base_status: "lead", color: "blue" });
                  }}
                >
                  <Plus className="w-4 h-4" />
                  סטטוס חדש
                </Button>
              </DialogTrigger>
              <DialogContent dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    {editingStatus ? "עריכת סטטוס" : "הוספת סטטוס חדש"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="label">שם הסטטוס</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({...formData, label: e.target.value})}
                      placeholder="הכנס שם לסטטוס"
                      required
                      className="text-right"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base_status">סוג בסיסי</Label>
                    <Select
                      value={formData.base_status}
                      onValueChange={(value) => setFormData({...formData, base_status: value})}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="בחר סוג בסיסי" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {BASE_STATUS_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-right">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">צבע</Label>
                    <Select
                      value={formData.color}
                      onValueChange={(value) => setFormData({...formData, color: value})}
                    >
                      <SelectTrigger className="text-right">
                        <SelectValue placeholder="בחר צבע" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        {COLOR_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value} className="text-right">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${option.class.split(' ')[0]}`}></div>
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      ביטול
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">
                      {editingStatus ? "עדכן" : "הוסף"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button
              size="sm"
              variant="outline"
              onClick={resetToDefaults}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              איפוס
            </Button>
      </CardFooter>
    </Card>
  );
}
