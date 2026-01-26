import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Edit, Trash2, ExternalLink, Code, MoreVertical, Eye, EyeOff } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

export default function FormConnectionCard({ formConnection, onEdit, onDelete, onToggle }) {
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const { toast } = useToast();

  const webhookUrl = formConnection.webhook_url || `${window.location.origin}/api/functions/receiveWebsiteLead`;
  const secretKey = formConnection.secret_key || '';
  const formId = formConnection.form_id || '';

  const getInstructionsByPlatform = () => {
    switch (formConnection.platform_type) {
      case 'WIX':
        return {
          title: "הנחיות חיבור ל-Wix",
          content: `
**שלב 1: צור Automation ב-Wix**
1. היכנס ל-Dashboard של Wix
2. עבור ל-Automations
3. צור Automation חדש עם Trigger: "Form is submitted"

**שלב 2: הוסף HTTP Request Action**
1. בחר Action: "Send HTTP Request"
2. הגדר את הפרטים הבאים:

**URL:**
${webhookUrl}

**Method:** POST

**Headers:**
Content-Type: application/json

**Body (JSON):**
{
  "form_id": "${formId}",
  "secret_key": "${secretKey}",
  "name": "{{name}}",
  "email": "{{email}}",
  "phone": "{{phone}}",
  "company": "{{company}}",
  "notes": "{{message}}",
  "page_url": "{{page_url}}"
}

**הערה:** התאם את שמות השדות לשמות השדות בטופס שלך ב-Wix.
          `
        };
      case 'WORDPRESS':
        return {
          title: "הנחיות חיבור ל-WordPress",
          content: `
**אופציה 1: Contact Form 7 + Webhook**
1. התקן את התוסף "CF7 Webhook"
2. בהגדרות הטופס, הוסף Webhook:

**URL:**
${webhookUrl}

**Payload:**
{
  "form_id": "${formId}",
  "secret_key": "${secretKey}",
  "name": "[your-name]",
  "email": "[your-email]",
  "phone": "[your-phone]",
  "company": "[your-company]",
  "notes": "[your-message]",
  "page_url": "[_url]"
}

**אופציה 2: WPForms + Zapier/Webhooks**
השתמש בתוסף של WPForms לשליחת Webhooks והגדר את אותם פרמטרים.

**אופציה 3: Code Snippet**
הוסף את הקוד שמופיע בלשונית "קוד שילוב" לדף שלך.
          `
        };
      case 'HTML_CODE':
        return {
          title: "קוד HTML לשילוב",
          content: `
<form id="leadForm_${formId}">
  <input type="text" name="name" placeholder="שם מלא" required />
  <input type="email" name="email" placeholder="אימייל" required />
  <input type="tel" name="phone" placeholder="טלפון" />
  <input type="text" name="company" placeholder="שם חברה" />
  <textarea name="notes" placeholder="הערות"></textarea>
  <button type="submit">שלח</button>
</form>

<script>
document.getElementById('leadForm_${formId}').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // הוספת מזהים ופרמטרים
  data.form_id = '${formId}';
  data.secret_key = '${secretKey}';
  data.page_url = window.location.href;
  
  // הוספת פרמטרי UTM אם קיימים
  const urlParams = new URLSearchParams(window.location.search);
  data.utm_source = urlParams.get('utm_source') || '';
  data.utm_medium = urlParams.get('utm_medium') || '';
  data.utm_campaign = urlParams.get('utm_campaign') || '';
  
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
      const error = await response.json();
      alert('שגיאה: ' + (error.error || 'לא ניתן לשלוח'));
    }
  } catch (error) {
    alert('שגיאה בשליחת הטופס');
  }
});
</script>
          `
        };
      default:
        return {
          title: "הנחיות כלליות",
          content: `
שלח בקשת POST ל:
${webhookUrl}

עם JSON בפורמט:
{
  "form_id": "${formId}",
  "secret_key": "${secretKey}",
  "name": "שם הלקוח",
  "email": "email@example.com",
  "phone": "050-1234567",
  "company": "שם החברה",
  "notes": "הודעה",
  "page_url": "https://example.com/page"
}

שדות חובה: form_id, secret_key, name, email
          `
        };
    }
  };

  const instructions = getInstructionsByPlatform();

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק ללוח!",
      description: `${label} הועתק בהצלחה`,
      className: "bg-green-100 text-green-900 border-green-200",
    });
  };

  const maskedSecretKey = secretKey ? `${secretKey.substring(0, 8)}...${secretKey.substring(secretKey.length - 4)}` : '';

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold">{formConnection.form_name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">{formConnection.client_name || 'ללא לקוח משויך'}</p>
            <Badge variant="outline" className="mt-2">{formConnection.platform_type}</Badge>
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
                <code className="bg-slate-100 px-2 py-1 rounded text-xs truncate">{formId}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => copyToClipboard(formId, "מזהה הטופס")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-slate-500 mb-1">שליחות שהתקבלו</p>
              <p className="font-bold text-lg">{formConnection.submissions_count || 0}</p>
            </div>
          </div>

          <div>
            <p className="text-slate-500 mb-1 text-sm">מפתח סודי</p>
            <div className="flex items-center gap-2">
              <code className="bg-slate-100 px-2 py-1 rounded text-xs flex-1 truncate">
                {showSecretKey ? secretKey : maskedSecretKey}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0"
                onClick={() => setShowSecretKey(!showSecretKey)}
              >
                {showSecretKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 flex-shrink-0"
                onClick={() => copyToClipboard(secretKey, "המפתח הסודי")}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {formConnection.last_submission_at && (
            <div className="text-sm">
              <p className="text-slate-500">שליחה אחרונה:</p>
              <p className="font-medium">{new Date(formConnection.last_submission_at).toLocaleString('he-IL')}</p>
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
              Webhook
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowCodeDialog(true)}
              className="flex-1"
            >
              <Code className="ml-2 h-4 w-4" />
              הנחיות חיבור
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>כתובת Webhook</DialogTitle>
            <DialogDescription>
              העתק את הכתובת הזו והשתמש בה בהגדרות הטופס
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{instructions.title}</DialogTitle>
            <DialogDescription>
              הנחיות מותאמות לפלטפורמה {formConnection.platform_type}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-900 p-4 rounded-lg overflow-x-auto">
              <pre className="text-sm text-slate-100 whitespace-pre-wrap">{instructions.content}</pre>
            </div>
            <Button 
              onClick={() => copyToClipboard(instructions.content, "ההנחיות")}
              className="w-full"
            >
              <Copy className="ml-2 h-4 w-4" />
              העתק הנחיות
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}