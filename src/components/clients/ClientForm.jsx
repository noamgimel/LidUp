import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, User, Settings } from "lucide-react";
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { PRIORITY_CONFIG, STAGE_TO_LIFECYCLE } from "./LeadPriorityConfig";

const PRIORITY_OPTIONS = [
  { id: "overdue", label: PRIORITY_CONFIG.overdue.label },
  { id: "hot",     label: PRIORITY_CONFIG.hot.label },
  { id: "warm",    label: PRIORITY_CONFIG.warm.label },
  { id: "cold",    label: PRIORITY_CONFIG.cold.label }
];

export default function ClientForm({ client, onSubmit, onCancel }) {
  const { userWorkStages, isLoading: workStagesLoading } = useUserWorkStages();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    priority: "warm",
    lifecycle: "open",
    work_stage: "",
    notes: "",
    source: ""
  });

  useEffect(() => {
    const getWorkStage = (clientStage) => {
      if (userWorkStages.length > 0) {
        const exists = userWorkStages.some(s => s.id === clientStage);
        return exists ? clientStage : (userWorkStages[0]?.id || 'new_lead');
      }
      return clientStage || 'new_lead';
    };

    if (client) {
      setFormData({
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        priority: client.priority || "warm",
        lifecycle: client.lifecycle || "open",
        work_stage: getWorkStage(client.work_stage),
        notes: client.notes || "",
        source: client.source || ""
      });
    } else if (userWorkStages.length > 0) {
      setFormData(prev => ({ ...prev, work_stage: userWorkStages[0]?.id || 'new_lead' }));
    }
  }, [client, userWorkStages]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-set lifecycle when work_stage is closed_won / closed_lost
      if (field === 'work_stage') {
        updated.lifecycle = STAGE_TO_LIFECYCLE[value] || 'open';
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6 md:mb-8 rtl-text"
    >
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 text-right">
            <span>{client ? "עריכת ליד" : "ליד חדש"}</span>
            <User className="w-5 h-5 text-blue-600" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-right block">שם מלא *</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="שם הליד" required className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-right block">חברה</Label>
                <Input id="company" value={formData.company} onChange={(e) => handleChange("company", e.target.value)} placeholder="שם החברה" className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-right block">אימייל *</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="example@email.com" required className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-right block">טלפון</Label>
                <Input id="phone" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="050-1234567" className="text-right" />
              </div>
            </div>

            {/* Priority, Work Stage, Source */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-right block">דחיפות</Label>
                <Select value={formData.priority} onValueChange={(v) => handleChange("priority", v)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר דחיפות" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {PRIORITY_OPTIONS.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-right">{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_stage" className="text-right block">שלב בתהליך המכירה</Label>
                <Select value={formData.work_stage} onValueChange={(v) => handleChange("work_stage", v)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר שלב" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {workStagesLoading ? (
                      <SelectItem value="loading" disabled>טוען...</SelectItem>
                    ) : (
                      <>
                        {userWorkStages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id} className="text-right">{stage.label}</SelectItem>
                        ))}
                        <div className="border-t my-1"></div>
                        <Link to={createPageUrl("Settings")} className="block w-full">
                          <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent text-blue-600">
                            <Settings className="w-4 h-4 ml-2" />
                            <span>ערוך שלבי מכירה</span>
                          </div>
                        </Link>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {formData.lifecycle !== 'open' && (
                  <p className="text-xs text-slate-500">
                    מצב ליד: {formData.lifecycle === 'won' ? 'נסגר ✅' : 'לא רלוונטי ❌'}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="source" className="text-right block">מקור</Label>
                <Input id="source" value={formData.source} onChange={(e) => handleChange("source", e.target.value)} placeholder="פייסבוק, גוגל, הפניה..." className="text-right" />
              </div>
            </div>

            {/* Notes + Address */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-right block">כתובת</Label>
                <Input id="address" value={formData.address} onChange={(e) => handleChange("address", e.target.value)} placeholder="כתובת מלאה" className="text-right" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-right block">הערות</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} placeholder="הערות נוספות על הליד..." rows={3} className="text-right" />
              </div>
            </div>

            <div className="flex justify-start gap-3 pt-4">
              <Button type="submit" className="bg-gradient-to-l from-blue-600 to-blue-700 gap-2">
                <Save className="w-4 h-4" />
                <span>{client ? "עדכן" : "שמור"}</span>
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="gap-2">
                <X className="w-4 h-4" />
                <span>ביטול</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}