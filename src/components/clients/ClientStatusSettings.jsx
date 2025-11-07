import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Settings, ExternalLink } from "lucide-react";

export default function ClientStatusSettings() {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-600" />
          הגדרות סטטוסים
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <p className="text-slate-600">
            התאם אישית את סטטוסי הלקוחות שלך לפי הצרכים העסקיים
          </p>
          <Link to={createPageUrl("ClientStatusSettings")}>
            <Button className="bg-purple-600 hover:bg-purple-700 gap-2">
              <ExternalLink className="w-4 h-4" />
              פתח הגדרות סטטוסים
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}