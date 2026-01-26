import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit, Trash2, ExternalLink, Code, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function FormConnectionCard({ formConnection, onEdit, onDelete, onToggle }) {
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `${window.location.origin}/api/functions/receiveWebsiteLead?secret_key=YOUR_SECRET_KEY&form_id=${formConnection.form_id}`;

  const htmlCode = `<form id="leadForm">
  <input type="hidden" name="form_id" value="${formConnection.form_id}" />
  <input type="text" name="name" placeholder="שם מלא" required />
  <input type="email" name="email" placeholder="אימייל" required />
  <input type="tel" name="phone" placeholder="טלפון" />
  <input type="text" name="company" placeholder="שם חברה" />
  <textarea name="notes" placeholder="הערות"></textarea>
  <button type="submit">שלח</button>
</form>

<script>
document.getElementById('leadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // הוספת פרמטרי UTM אם קיימים
  const urlParams = new URLSearchParams(window.location.search);
  data.utm_source = urlParams.get('utm_source') || '';
  data.utm_medium = urlParams.get('utm_medium') || '';
  data.utm_campaign = urlParams.get('utm_campaign') || '';
  data.page_url = window.location.href;
  
  try {
    const response = await fetch('${webhookUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      alert('הטופס נשלח בהצלחה!');
      e.target.reset();
    } else {
      alert('שגיאה בשליחת הטופס');
    }
  } catch (error) {
    alert('שגיאה בשליחת הטופס');
  }
});
</script>`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק ללוח!",
      description: `${label} הועתק בהצלחה`,
      className: "bg-green-100 text-green-900 border-green-200",
    });
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold">{formConnection.form_name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{formConnection.client_name || 'ללא לקוח משויך'}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={formConnection.is_active ? "default" : "secondary"}>
              {formConnection.is_active ? "פעיל" : "לא פעיל"}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuItem onClick={() => onEdit(formConnection)}>
                  <Edit className="ml-2 h-4 w-4" />
                  <span>עריכה</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggle(formConnection)}>
                  <ExternalLink className="ml-2 h-4 w-4" />
                  <span>{formConnection.is_active ? 'השבת' : 'הפעל'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(formConnection.id)} className="text-red-600">
                  <Trash2 className="ml-2 h-4 w-4" />
                  <span>מחק</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">מזהה טופס</p>
              <div className="flex items-center gap-2">
                <code className="bg-slate-100 px-2 py-1 rounded text-xs">{formConnection.form_id}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(formConnection.form_id, "מזהה הטופס")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-slate-500 mb-1">לידים שהתקבלו</p>
              <p className="font-bold text-lg">{formConnection.leads_received || 0}</p>
            </div>
          </div>

          {formConnection.last_lead_date && (
            <div className="text-sm">
              <p className="text-slate-500">ליד אחרון התקבל ב:</p>
              <p className="font-medium">{new Date(formConnection.last_lead_date).toLocaleString('he-IL')}</p>
            </div>
          )}

          {formConnection.notes && (
            <div className="text-sm bg-slate-50 p-3 rounded">
              <p className="text-slate-600">{formConnection.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowWebhookDialog(true)}
              className="flex-1"
            >
              <ExternalLink className="ml-2 h-4 w-4" />
              כתובת Webhook
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCodeDialog(true)}
              className="flex-1"
            >
              <Code className="ml-2 h-4 w-4" />
              קוד שילוב
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>כתובת Webhook</DialogTitle>
            <DialogDescription>
              העתק את הכתובת הזו והשתמש בה בהגדרות הטופס שלך
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-100 p-4 rounded-lg overflow-x-auto">
              <code className="text-sm break-all">{webhookUrl}</code>
            </div>
            <Button 
              onClick={() => copyToClipboard(webhookUrl, "כתובת ה-Webhook")}
              className="w-full"
            >
              <Copy className="ml-2 h-4 w-4" />
              העתק כתובת
            </Button>
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>חשוב:</strong> החלף את YOUR_SECRET_KEY במפתח הסודי שלך מההגדרות.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>קוד HTML לשילוב</DialogTitle>
            <DialogDescription>
              העתק את הקוד הזו והדבק אותו באתר שלך
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100">{htmlCode}</pre>
            </div>
            <Button 
              onClick={() => copyToClipboard(htmlCode, "קוד ה-HTML")}
              className="w-full"
            >
              <Copy className="ml-2 h-4 w-4" />
              העתק קוד
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}