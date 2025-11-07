
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

// Static status options - no longer customizable
const STATUS_OPTIONS = [
  { id: "lead", label: "ליד", color: "yellow" },
  { id: "hot_lead", label: "ליד חם", color: "orange" },
  { id: "client", label: "לקוח", color: "green" },
  { id: "inactive", label: "לא פעיל", color: "gray" }
];

export default function ClientForm({ client, onSubmit, onCancel }) {
  const { userWorkStages, isLoading: workStagesLoading } = useUserWorkStages();

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    status: "lead",
    work_stage: "initial_contact",
    total_value: "",
    paid: "",
    notes: "",
    source: "" // Added new source field
  });
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    // Determine if work stage exists among fetched stages
    const getWorkStage = (clientStage) => {
        if (userWorkStages.length > 0) {
            const workStageExists = userWorkStages.some(s => s.id === clientStage);
            return workStageExists ? clientStage : (userWorkStages[0]?.id || 'initial_contact');
        }
        return clientStage || 'initial_contact';
    };

    if (client) {
      setFormData(prev => ({
        ...prev,
        name: client.name || "",
        company: client.company || "",
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
        status: client.status || "lead",
        work_stage: getWorkStage(client.work_stage), // Use helper for work stage
        total_value: client.total_value || "",
        paid: client.paid || "",
        notes: client.notes || "",
        source: client.source || "" // Set source from client data
      }));
    } else if (!client && userWorkStages.length > 0) {
      setFormData(prev => ({
          ...prev,
          work_stage: userWorkStages[0]?.id || 'initial_contact' // Only update work_stage if no client and stages loaded
      }));
    }
  }, [client, userWorkStages]); // Removed userStatuses from dependency array

  useEffect(() => {
    const total = parseFloat(formData.total_value) || 0;
    const paidAmount = parseFloat(formData.paid) || 0;
    setRemaining(total - paidAmount);
  }, [formData.total_value, formData.paid]);

  const isClientStatus = formData.status === 'client' || formData.status === 'inactive';

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      total_value: isClientStatus ? (formData.total_value ? parseFloat(formData.total_value) : 0) : 0,
      paid: isClientStatus ? (formData.paid ? parseFloat(formData.paid) : 0) : 0,
    };
    onSubmit(submitData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColorClass = (color) => {
    const colorClasses = {
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      green: "bg-green-100 text-green-800 border-green-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200"
    };
    return colorClasses[color] || colorClasses.gray;
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
            <span>{client ? "עריכת לקוח" : "לקוח חדש"}</span>
            <User className="w-5 h-5 text-blue-600" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-right block">שם מלא *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="שם הלקוח"
                  required
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company" className="text-right block">חברה</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  placeholder="שם החברה"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-right block">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-right block">טלפון</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="050-1234567"
                  className="text-right"
                />
              </div>
            </div>

            {/* Status, Work Stage and Source Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-right block">סטטוס *</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status.id} value={status.id} className="text-right">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColorClass(status.color).split(' ')[0]}`}></div>
                          {status.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_stage" className="text-right block">שלב עבודה</Label>
                <Select value={formData.work_stage} onValueChange={(value) => handleChange("work_stage", value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר שלב עבודה" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {workStagesLoading ? (
                      <SelectItem value="loading" disabled className="text-right">טוען...</SelectItem>
                    ) : (
                      <>
                        {userWorkStages.map(stage => (
                          <SelectItem key={stage.id} value={stage.id} className="text-right">
                            {stage.label}
                          </SelectItem>
                        ))}
                        <div className="border-t my-1"></div>
                        <Link to={createPageUrl("Settings")} className="block w-full">
                          <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent focus:text-accent-foreground text-blue-600">
                            <Settings className="w-4 h-4 ml-2" />
                            <span>ערוך שלבי עבודה</span>
                          </div>
                        </Link>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* New Source Input */}
              <div className="space-y-2">
                <Label htmlFor="source" className="text-right block">מקור</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => handleChange("source", e.target.value)}
                  placeholder="פייסבוק, גוגל, הפניה, וכו'"
                  className="text-right"
                />
              </div>
            </div>

            {/* Financial Fields - Only for clients */}
            {isClientStatus && (
              <>
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 text-right">פרטים כספיים</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="total_value" className="text-right block">סכום עסקה כולל (₪)</Label>
                      <Input
                        id="total_value"
                        type="number"
                        value={formData.total_value}
                        onChange={(e) => handleChange("total_value", e.target.value)}
                        placeholder="0"
                        className="text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paid" className="text-right block">שולם (₪)</Label>
                      <Input
                        id="paid"
                        type="number"
                        value={formData.paid}
                        onChange={(e) => handleChange("paid", e.target.value)}
                        placeholder="0"
                        className="text-right"
                      />
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className={`p-4 rounded-lg border text-right mt-4 ${remaining > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
                    <p className={`text-sm font-medium ${remaining > 0 ? 'text-orange-700' : 'text-green-700'}`}>יתרה לתשלום</p>
                    <p className={`text-xl font-bold ${remaining > 0 ? 'text-orange-900' : 'text-green-900'}`}>
                      ₪{remaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-right block">כתובת</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="כתובת מלאה"
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-right block">הערות</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="הערות נוספות על הלקוח..."
                  rows={3}
                  className="text-right"
                />
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
