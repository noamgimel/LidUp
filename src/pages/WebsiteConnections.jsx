import React, { useState, useEffect } from "react";
import { User } from "@/entities/User";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Globe,
  Pause,
  Play,
  RefreshCw,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Copy,
  Crown,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import moment from "moment";

export default function WebsiteConnections() {
  const [currentUser, setCurrentUser] = useState(null);
  const [connections, setConnections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);

      if (user.plan_type !== 'PREMIUM' && user.email !== 'noam.gamliel@gmail.com') {
        // User is not premium, don't load connections
        setConnections([]);
        setIsLoading(false);
        return;
      }

      const response = await base44.functions.invoke('getMyFormConnections');
      if (response.data?.ok) {
        setConnections(response.data.items || []);
      } else {
        console.error('Failed to load connections:', response.data?.error);
        setConnections([]);
      }
    } catch (error) {
      console.error("שגיאה בטעינת נתונים:", error);
      setConnections([]);
    }
    setIsLoading(false);
  };

  const handleToggleStatus = async (connection) => {
    try {
      const newStatus = !connection.is_active;
      const response = await base44.functions.invoke('setFormConnectionStatus', {
        form_connection_id: connection.id,
        is_active: newStatus
      });

      if (response.data?.ok) {
        toast({
          title: "הצלחה!",
          description: `החיבור ${newStatus ? 'הופעל' : 'הושהה'} בהצלחה`,
          className: "bg-green-100 text-green-900 border-green-200",
        });
        loadData(); // Refresh list
      } else {
        throw new Error(response.data?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: "שגיאה",
        description: "לא ניתן לשנות את סטטוס החיבור",
        variant: "destructive",
      });
    }
  };

  const toggleRowExpand = (connectionId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(connectionId)) {
      newExpanded.delete(connectionId);
    } else {
      newExpanded.add(connectionId);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "הועתק!",
      description: "הטקסט הועתק ללוח",
      className: "bg-blue-100 text-blue-900 border-blue-200",
    });
  };

  const getPlatformBadge = (platformType) => {
    const platforms = {
      WIX: { label: "WIX", color: "bg-blue-100 text-blue-800 border-blue-200" },
      WORDPRESS: { label: "WordPress", color: "bg-orange-100 text-orange-800 border-orange-200" },
      HTML_CODE: { label: "HTML", color: "bg-slate-100 text-slate-800 border-slate-200" },
      OTHER: { label: "אחר", color: "bg-gray-100 text-gray-800 border-gray-200" }
    };
    const platform = platforms[platformType] || platforms.OTHER;
    return <Badge className={platform.color}>{platform.label}</Badge>;
  };

  // Not premium check
  if (!isLoading && currentUser && currentUser.plan_type !== 'PREMIUM' && currentUser.email !== 'noam.gamliel@gmail.com') {
    return (
      <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">חיבורי האתר</h1>
          <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-purple-100 rounded-full">
                  <Crown className="w-12 h-12 text-purple-600" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-purple-900 mb-3">תכונה זו זמינה למשתמשי פרימיום</h2>
              <p className="text-purple-800 mb-6">
                שדרג לחשבון פרימיום כדי לחבר טפסים מהאתר שלך וליהנות מקליטת לידים אוטומטית
              </p>
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                onClick={() => window.location.href = 'mailto:noam.gamliel@gmail.com?subject=שדרוג לפרימיום'}
              >
                <Crown className="w-4 h-4 ml-2" />
                שדרג לפרימיום
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-20 pb-4 sm:px-6 md:p-8 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl("Integrations")}>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
              <ArrowRight className="w-4 h-4" />
              חזרה לאינטגרציות
            </Button>
          </Link>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">חיבורי האתר</h1>
            <p className="text-slate-600">נהל את כל חיבורי הטפסים מהאתר שלך</p>
          </div>
          <Button onClick={loadData} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            רענן
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && connections.length === 0 && (
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-slate-100 rounded-full">
                  <Globe className="w-12 h-12 text-slate-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">אין עדיין חיבורי אתר</h3>
              <p className="text-slate-600 mb-4">
                פנה לתמיכה או לאדמין כדי ליצור חיבור טופס חדש
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = 'mailto:noam.gamliel@gmail.com?subject=בקשה לחיבור טופס חדש'}
              >
                צור קשר
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Connections Table */}
        {!isLoading && connections.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="table-rtl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם החיבור</TableHead>
                      <TableHead className="text-right">פלטפורמה</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">לידים שנקלטו</TableHead>
                      <TableHead className="text-right">ליד אחרון</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.map((connection) => (
                      <React.Fragment key={connection.id}>
                        <TableRow className="hover:bg-slate-50">
                          <TableCell className="font-medium">{connection.form_name}</TableCell>
                          <TableCell>{getPlatformBadge(connection.platform_type)}</TableCell>
                          <TableCell>
                            {connection.is_active ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                פעיל
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-800 border-slate-200">
                                <XCircle className="w-3 h-3 ml-1" />
                                מושהה
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-blue-600">{connection.submissions_count || 0}</span>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            {connection.last_submission_at
                              ? moment(connection.last_submission_at).format('DD/MM/YYYY HH:mm')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={connection.is_active ? "outline" : "default"}
                              onClick={() => handleToggleStatus(connection)}
                              className={connection.is_active ? "" : "bg-green-600 hover:bg-green-700"}
                            >
                              {connection.is_active ? (
                                <>
                                  <Pause className="w-3 h-3 ml-1" />
                                  השהה
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 ml-1" />
                                  הפעל
                                </>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleRowExpand(connection.id)}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${
                                  expandedRows.has(connection.id) ? 'rotate-180' : ''
                                }`}
                              />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(connection.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-slate-50 p-6">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">פרטי החיבור</h4>
                                  <div className="grid gap-3 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-slate-700">מזהה טופס:</span>
                                      <code className="bg-slate-200 px-2 py-1 rounded text-xs">{connection.form_id}</code>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => copyToClipboard(connection.form_id)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    {connection.webhook_url && (
                                      <div className="flex items-start gap-2">
                                        <span className="font-medium text-slate-700">Webhook URL:</span>
                                        <div className="flex-1">
                                          <code className="bg-slate-200 px-2 py-1 rounded text-xs break-all block">
                                            {connection.webhook_url}
                                          </code>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => copyToClipboard(connection.webhook_url)}
                                        >
                                          <Copy className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    )}
                                    {connection.notes && (
                                      <div>
                                        <span className="font-medium text-slate-700">הערות:</span>
                                        <p className="text-slate-600 mt-1">{connection.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}