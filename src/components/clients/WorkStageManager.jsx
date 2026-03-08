import React, { useState, useEffect } from "react";
import { UserCustomWorkStages } from "@/entities/UserCustomWorkStages";
import { Client } from "@/entities/Client";
import { User } from "@/entities/User";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Settings, Palette, Save, X, RefreshCw, ArrowUp, ArrowDown, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { DEFAULT_WORK_STAGES } from "../utils/workStagesUtils";
import { getWorkStageColorClass } from "../utils/workStagesUtils"; // New import

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

export default function WorkStageManager() {
  const { toast } = useToast();
  const [userWorkStages, setUserWorkStages] = useState(DEFAULT_WORK_STAGES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [formData, setFormData] = useState({
    label: "",
    description: "",
    color: "blue"
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientsInStages, setClientsInStages] = useState({});

  useEffect(() => {
    loadUserWorkStages();
  }, []);

  const loadUserWorkStages = async () => {
    setIsLoading(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const user = await base44.auth.me();
      setCurrentUser(user);
      
      const [customWorkStages, clients] = await Promise.all([
        base44.entities.UserCustomWorkStages.filter({ user_email: user.email }),
        base44.entities.Client.filter({ created_by: user.email })
      ]);
      
      // Count clients in each stage
      const stageCount = {};
      clients.forEach(client => {
        if (client.work_stage) {
          stageCount[client.work_stage] = (stageCount[client.work_stage] || 0) + 1;
        }
      });
      setClientsInStages(stageCount);
      
      if (customWorkStages.length > 0) {
        setUserWorkStages(customWorkStages[0].custom_work_stages);
      } else {
        setUserWorkStages(DEFAULT_WORK_STAGES);
      }
    } catch (error) {
      console.error("שגיאה בטעינת שלבי עבודה:", error);
      setUserWorkStages(DEFAULT_WORK_STAGES);
    }
    setIsLoading(false);
  };

  const saveUserWorkStages = async (stages) => {
    try {
      const existingRecord = await UserCustomWorkStages.filter({ user_email: currentUser.email });
      
      const stageData = {
        user_email: currentUser.email,
        custom_work_stages: stages
      };

      if (existingRecord.length > 0) {
        await UserCustomWorkStages.update(existingRecord[0].id, stageData);
      } else {
        await UserCustomWorkStages.create(stageData);
      }
    } catch (error) {
      console.error("שגיאה בשמירת שלבי עבודה:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let newStages;
    
    if (editingStage) {
      newStages = userWorkStages.map(stage => 
        stage.id === editingStage.id 
          ? { ...stage, ...formData }
          : stage
      );
    } else {
      const newStage = {
        id: `custom_${Date.now()}`,
        ...formData,
        order: userWorkStages.length + 1,
        is_active: true
      };
      newStages = [...userWorkStages, newStage];
    }
    
    setUserWorkStages(newStages);
    await saveUserWorkStages(newStages);
    
    toast({
    title: "הצלחה!",
    description: "שלבי המכירה עודכנו בהצלחה.",
      className: "bg-green-100 text-green-900 border-green-200",
    });
    
    setIsDialogOpen(false);
    setEditingStage(null);
    setFormData({ label: "", description: "", color: "blue" });
  };

  const handleEdit = (stage) => {
    setEditingStage(stage);
    setFormData({
      label: stage.label,
      description: stage.description || "",
      color: stage.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (stageId) => {
    const clientCount = clientsInStages[stageId] || 0;
    
    if (clientCount > 0) {
      toast({
        title: "לא ניתן למחוק",
        description: `יש ${clientCount} לקוחות בשלב זה. העבר אותם תחילה לשלב אחר.`,
        variant: "destructive",
      });
      return;
    }

    const newStages = userWorkStages.filter(stage => stage.id !== stageId);
    setUserWorkStages(newStages);
    await saveUserWorkStages(newStages);
    toast({
      title: "שלב נמחק",
      description: "שלב המכירה הוסר בהצלחה מהרשימה.",
      className: "bg-green-100 text-green-900 border-green-200", // Added class for success toast
    });
  };

  const moveStage = async (stageId, direction) => {
    const currentIndex = userWorkStages.findIndex(s => s.id === stageId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === userWorkStages.length - 1)
    ) {
      return;
    }

    const newStages = [...userWorkStages];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap stages
    [newStages[currentIndex], newStages[targetIndex]] = [newStages[targetIndex], newStages[currentIndex]];
    
    // Update order numbers
    newStages.forEach((stage, index) => {
      stage.order = index + 1;
    });

    setUserWorkStages(newStages);
    await saveUserWorkStages(newStages);
  };

  const resetToDefaults = async () => {
    setUserWorkStages(DEFAULT_WORK_STAGES);
    await saveUserWorkStages(DEFAULT_WORK_STAGES);
    toast({
      title: "איפוס הושלם",
      description: "שלבי המכירה אופסו לברירת המחדל של המערכת.",
      className: "bg-blue-100 text-blue-900 border-blue-200",
    });
  };

  const getColorClass = (color) => {
    return getWorkStageColorClass(color);
  };

  const canDeleteStage = (stage) => {
    // Only allow deletion of stages that are not the default 'blue' or the very first/last stages.
    // Assuming 'blue' stages are the intermediate, user-defined ones.
    // This logic might need refinement based on exact business rules for default stages.
    // If the prompt implies only user-added stages can be blue and thus deletable, this is fine.
    return stage.color === 'blue';
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
        <CardTitle className="flex items-center gap-2 text-sm md:text-base">
          <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
          ניהול שלבי המכירה
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-2 md:space-y-3">
          <AnimatePresence>
            {userWorkStages.map((stage, index) => (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between p-2 md:p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  <Badge className={`${getColorClass(stage.color)} border text-xs whitespace-nowrap`}>
                    {stage.label}
                  </Badge>
                  {stage.description && (
                    <span className="text-xs md:text-sm text-slate-500 truncate max-w-xs hidden sm:inline">
                      {stage.description}
                    </span>
                  )}
                  {clientsInStages[stage.id] > 0 && (
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {clientsInStages[stage.id]} לקוחות
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveStage(stage.id, 'up')}
                    disabled={index === 0}
                    className="h-6 w-6 md:h-8 md:w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <ArrowUp className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveStage(stage.id, 'down')}
                    disabled={index === userWorkStages.length - 1}
                    className="h-6 w-6 md:h-8 md:w-8 text-slate-600 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <ArrowDown className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(stage)}
                    className="h-6 w-6 md:h-8 md:w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                  {canDeleteStage(stage) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 md:h-8 md:w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>מחיקת שלב מכירה</AlertDialogTitle>
                                       <AlertDialogDescription>
                                         האם אתה בטוח שברצונך למחוק את שלב המכירה "{stage.label}"?
                            {clientsInStages[stage.id] > 0 && (
                              <span className="block mt-2 text-red-600 font-medium">
                                יש {clientsInStages[stage.id]} לקוחות בשלב זה!
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ביטול</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(stage.id)}
                            disabled={clientsInStages[stage.id] > 0}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            מחק
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {userWorkStages.length === 0 && (
          <div className="text-center py-6 md:py-8 text-slate-500">
            <ClipboardList className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">אין שלבי מכירה מוגדרים</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-center gap-2">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-purple-600 hover:bg-purple-700 gap-2 w-full sm:flex-1"
              onClick={() => {
                setEditingStage(null);
                setFormData({ label: "", description: "", color: "blue" });
              }}
            >
              <Plus className="w-4 h-4" />
              שלב חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingStage ? "עריכת שלב מכירה" : "הוספת שלב מכירה חדש"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="label">שם השלב</Label>
                <Input
                  id="label"
                  value={formData.label}
                  onChange={(e) => setFormData({...formData, label: e.target.value})}
                  placeholder="הכנס שם לשלב המכירה"
                  required
                  className="text-right"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">תיאור (אופציונלי)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="תיאור קצר של השלב"
                  rows={2}
                  className="text-right"
                />
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
                  {editingStage ? "עדכן" : "הוסף"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:flex-1 gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              איפוס
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>איפוס שלבי מכירה</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך לאפס את כל שלבי המכירה לברירת המחדל של המערכת?
                פעולה זו תמחק את כל השלבים המותאמים אישית.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults} className="bg-red-600 hover:bg-red-700">
                אפס
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}