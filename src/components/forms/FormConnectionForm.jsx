import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function FormConnectionForm({ formConnection, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    form_name: "",
    client_name: "",
    notes: "",
  });

  useEffect(() => {
    if (formConnection) {
      setFormData({
        form_name: formConnection.form_name || "",
        client_name: formConnection.client_name || "",
        notes: formConnection.notes || "",
      });
    }
  }, [formConnection]);

  const handleSubmit = (e) => {
    e.preventDefault();
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

            <div>
              <Label htmlFor="client_name">שם הלקוח</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e) => setFormData({...formData, client_name: e.target.value})}
                placeholder="למשל: חברת ABC"
                className="mt-2"
              />
              <p className="text-xs text-slate-500 mt-1">הלקוח שהטופס מיועד עבורו</p>
            </div>
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