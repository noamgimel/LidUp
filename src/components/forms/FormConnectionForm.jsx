import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FormConnectionForm({ formConnection, clients, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    form_name: "",
    client_id: "",
    client_name: "",
    platform_type: "HTML_CODE",
    notes: "",
  });

  useEffect(() => {
    if (formConnection) {
      setFormData({
        form_name: formConnection.form_name || "",
        client_id: formConnection.client_id || "",
        client_name: formConnection.client_name || "",
        platform_type: formConnection.platform_type || "HTML_CODE",
        notes: formConnection.notes || "",
      });
    }
  }, [formConnection]);

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find(c => c.id === clientId);
    setFormData({
      ...formData, 
      client_id: clientId,
      client_name: selectedClient ? selectedClient.name : ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.client_id) {
      alert("יש לבחור לקוח");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card className="bg-white shadow-lg mb-6">
      <CardHeader className="border-b bg-gradient-to-l from-blue-50 to-white">
        <CardTitle className="text-xl">
          {formConnection ? "עריכת חיבור טופס" : "חיבור טופס חדש"}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label htmlFor="client_id">בחר לקוח *</Label>
              <Select 
                value={formData.client_id} 
                onValueChange={handleClientChange}
                disabled={!!formConnection}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="בחר לקוח מהרשימה" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company ? `(${client.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {formConnection ? "לא ניתן לשנות לקוח בחיבור קיים" : "הלקוח שהטופס מיועד עבורו"}
              </p>
            </div>

            <div>
              <Label htmlFor="form_name">שם הטופס *</Label>
              <Input
                id="form_name"
                value={formData.form_name}
                onChange={(e) => setFormData({...formData, form_name: e.target.value})}
                placeholder="למשל: טופס יצירת קשר - דף הבית"
                required
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">שם לזיהוי הטופס במערכת</p>
            </div>
          </div>

          <div>
            <Label htmlFor="platform_type">סוג האתר *</Label>
            <Select 
              value={formData.platform_type} 
              onValueChange={(value) => setFormData({...formData, platform_type: value})}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="WIX">Wix</SelectItem>
                <SelectItem value="WORDPRESS">WordPress</SelectItem>
                <SelectItem value="HTML_CODE">קוד HTML מותאם</SelectItem>
                <SelectItem value="OTHER">אחר</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">הפלטפורמה שבה הטופס מוטמע</p>
          </div>

          <div>
            <Label htmlFor="notes">הערות</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="הערות נוספות על הטופס..."
              className="mt-2 min-h-[100px]"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-700">
              {formConnection ? "עדכן" : "צור חיבור"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}