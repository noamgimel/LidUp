
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, X, Calendar } from "lucide-react";

const meetingTypes = [
  { value: "phone", label: "שיחת טלפון" },
  { value: "video", label: "פגישת וידאו" },
  { value: "in_person", label: "פגישה פרונטלית" }
];

const statusOptions = [
  { value: "scheduled", label: "מתוכנן" },
  { value: "completed", label: "הושלם" }
];

// Generate time options in 5-minute intervals
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 5) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push({ value: timeStr, label: displayTime });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

export default function MeetingForm({ meeting, clients, onSubmit, onCancel, preSelectedClient }) {
  const [formData, setFormData] = useState({
    title: "",
    client_id: "",
    client_name: "",
    client_email: "",
    date: "",
    time: "",
    duration: 60,
    location: "פגישה בגוגל מיטינגס",
    type: "video",
    status: "scheduled",
    notes: "",
    outcome: ""
  });

  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || "",
        client_id: meeting.client_id || "",
        client_name: meeting.client_name || "",
        client_email: meeting.client_email || "",
        date: meeting.date || "",
        time: meeting.time || "",
        duration: meeting.duration || 60,
        location: meeting.location || "פגישה בגוגל מיטינגס",
        type: meeting.type || "video",
        status: meeting.status || "scheduled",
        notes: meeting.notes || "",
        outcome: meeting.outcome || ""
      });
    } else {
      setFormData({
        title: "",
        client_id: "",
        client_name: "",
        client_email: "",
        date: "",
        time: "",
        duration: 60,
        location: "פגישה בגוגל מיטינגס",
        type: "video",
        status: "scheduled",
        notes: "",
        outcome: ""
      });

      if (preSelectedClient) {
        setFormData(prev => ({
          ...prev,
          client_id: preSelectedClient.id,
          client_name: preSelectedClient.name,
          client_email: preSelectedClient.email || ""
        }));
      }
    }
    // Clear validation errors when meeting data changes (e.g., loading new meeting or clearing form)
    setValidationErrors({});
  }, [meeting, preSelectedClient]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "נושא הפגישה נדרש.";
    }
    if (!formData.client_id) {
      errors.client_id = "לקוח הפגישה נדרש.";
    }
    if (!formData.date) {
      errors.date = "תאריך הפגישה נדרש.";
    }
    if (!formData.time) {
      errors.time = "שעת הפגישה נדרשת.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return; // Stop form submission if there are validation errors
    }

    // Clear previous errors if validation passes
    setValidationErrors({});

    // Calculate startDateTime and endDateTime
    const startDate = new Date(`${formData.date}T${formData.time}`);
    const startDateTime = formData.date && formData.time ? startDate.toISOString() : null;
    const endDateTime = startDateTime ? new Date(startDate.getTime() + (formData.duration || 0) * 60 * 1000).toISOString() : null;

    const finalData = {
      ...formData,
      startDateTime,
      endDateTime
    };

    onSubmit(finalData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => {
        const newFormData = { ...prev, [field]: value };
        if (field === 'type') {
            if (value === 'video') {
                newFormData.location = 'פגישה בגוגל מיטינגס';
            } else if (value === 'phone') {
                newFormData.location = 'שיחת טלפון';
            } else if (value === 'in_person') {
                newFormData.location = '';
            }
        }
        return newFormData;
    });
    // Clear validation error for the field being changed
    setValidationErrors(prevErrors => ({ ...prevErrors, [field]: undefined }));
  };

  const handleClientSelect = (clientId) => {
    const selectedClient = clients.find(c => c.id === clientId);
    setFormData(prev => ({
      ...prev,
      client_id: clientId,
      client_name: selectedClient ? selectedClient.name : "",
      client_email: selectedClient ? selectedClient.email || "" : ""
    }));
    // Clear validation error for client_id
    setValidationErrors(prevErrors => ({ ...prevErrors, client_id: undefined }));
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
            <span>{meeting ? "עריכת פגישה" : "פגישה חדשה"}</span>
            <Calendar className="w-5 h-5 text-purple-600" />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-right block">נושא הפגישה *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="נושא הפגישה"
                  required
                  className={`text-right ${validationErrors.title ? 'border-red-500' : ''}`}
                />
                {validationErrors.title && (
                  <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.title}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client" className="text-right block">לקוח *</Label>
                <Select value={formData.client_id} onValueChange={handleClientSelect}>
                  <SelectTrigger className={`text-right ${validationErrors.client_id ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id} className="text-right">
                        {client.name} {client.company && `- ${client.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.client_id && (
                  <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.client_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date" className="text-right block">תאריך *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange("date", e.target.value)}
                  required
                  className={`text-right ${validationErrors.date ? 'border-red-500' : ''}`}
                />
                {validationErrors.date && (
                  <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="text-right block">שעה *</Label>
                <Select value={formData.time} onValueChange={(value) => handleChange("time", value)}>
                  <SelectTrigger className={`text-right ${validationErrors.time ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="בחר שעה" />
                  </SelectTrigger>
                  <SelectContent dir="rtl" className="max-h-60">
                    {timeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value} className="text-right">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.time && (
                  <p className="text-red-500 text-sm mt-1 text-right">{validationErrors.time}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-right block">משך (דקות)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration}
                  onChange={(e) => handleChange("duration", parseInt(e.target.value))}
                  className="text-right"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-right block">סוג פגישה</Label>
                <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {meetingTypes.map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-right">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-right block">סטטוס</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {statusOptions.map(status => (
                      <SelectItem key={status.value} value={status.value} className="text-right">
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location" className="text-right block">מיקום</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="מיקום הפגישה או קישור"
                  className="text-right"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-right block">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="הערות לפגישה..."
                rows={3}
                className="text-right"
              />
            </div>
            {formData.status === "completed" && (
              <div className="space-y-2">
                <Label htmlFor="outcome" className="text-right block">תוצאות הפגישה</Label>
                <Textarea
                  id="outcome"
                  value={formData.outcome}
                  onChange={(e) => handleChange("outcome", e.target.value)}
                  placeholder="מה היו תוצאות הפגישה..."
                  rows={3}
                  className="text-right"
                />
              </div>
            )}
            <div className="flex justify-start gap-3 pt-4">
              <Button type="submit" className="bg-gradient-to-l from-purple-600 to-purple-700 gap-2">
                <Save className="w-4 h-4" />
                <span>{meeting ? "עדכן" : "שמור"}</span>
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
