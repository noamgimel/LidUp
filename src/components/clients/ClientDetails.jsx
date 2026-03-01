import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Edit, User, Calendar, Clock, Plus, ChevronUp, FilePlus2, FileEdit, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useUserWorkStages } from "../hooks/useUserWorkStages";
import { getWorkStageColorClass } from "../utils/workStagesUtils";
import { PRIORITY_CONFIG, LIFECYCLE_CONFIG } from "./LeadPriorityConfig";

const DetailItem = ({ icon: Icon, label, value, children }) => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
      <Icon className="w-5 h-5 text-slate-600" />
    </div>
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      {children ? children : <p className="font-medium text-slate-900 break-words">{value || '-'}</p>}
    </div>
  </div>
);

const formatIsraeliDate = (dateString) => {
  if (!dateString) return '-';
  try {
    return new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(dateString));
  } catch { return '-'; }
};

export default function ClientDetails({ client, meetings, onClose, onEdit, onCreateMeeting }) {
  const { userWorkStages } = useUserWorkStages();
  const upcomingMeetings = meetings?.filter(m => m.status === 'scheduled' && new Date(m.date) >= new Date()) || [];

  const priority = client.priority || 'warm';
  const pCfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.warm;
  const lifecycle = client.lifecycle || 'open';
  const lCfg = LIFECYCLE_CONFIG[lifecycle];

  const workStage = userWorkStages.find(s => s.id === client.work_stage);
  const workStageLabel = workStage?.label || client.work_stage;
  const workStageColor = workStage ? getWorkStageColorClass(workStage.color) : "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6 md:mb-8 rtl-text"
    >
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-slate-100">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
            <User className="w-6 h-6 text-blue-600" />
            <span>{client.name}</span>
            <Badge className={`${pCfg.badge} border text-sm`}>{pCfg.label}</Badge>
            {lifecycle !== 'open' && (
              <Badge className={`${lCfg.badge} border text-sm`}>{lCfg.label}</Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="sm" onClick={onEdit} className="gap-2 bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
              <Edit className="w-4 h-4" /><span>עריכה</span>
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} className="gap-2 flex-1 sm:flex-none">
              <X className="w-4 h-4" /><span>סגור</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-6">
          {/* Contact details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">אימייל</h4>
                  <p className="text-slate-900">{client.email || 'לא צוין'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">טלפון</h4>
                  <p className="text-slate-900">{client.phone || 'לא צוין'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">חברה</h4>
                  <p className="text-slate-900">{client.company || 'לא צוין'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">מקור</h4>
                  <p className="text-slate-900">{client.source || 'לא צוין'}</p>
                </div>
              </div>
              {client.address && (
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-1">כתובת</h4>
                  <p className="text-slate-900">{client.address}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <DetailItem icon={ClipboardList} label="שלב בתהליך המכירה">
                {client.work_stage && workStageLabel ? (
                  <Badge className={`${workStageColor} border text-sm`}>{workStageLabel}</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-sm">לא מוגדר</Badge>
                )}
              </DetailItem>
            </div>
          </div>

          {/* System Info */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">מידע מערכת</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <DetailItem icon={FilePlus2} label="תאריך יצירה" value={formatIsraeliDate(client.created_date)} />
              <DetailItem icon={FileEdit} label="עדכון אחרון" value={formatIsraeliDate(client.updated_date)} />
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">הערות</h4>
              <p className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* Upcoming Meetings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                פגישות קרובות
              </h4>
              <Button size="icon" onClick={() => onCreateMeeting(client)} className="bg-purple-600 hover:bg-purple-700 h-8 w-8">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {upcomingMeetings.length > 0 ? (
              <div className="space-y-3">
                {upcomingMeetings.map(meeting => (
                  <div key={meeting.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-medium text-slate-800">{meeting.title}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>{format(new Date(meeting.date), 'dd/MM/yyyy', { locale: he })}</span></div>
                        <div className="flex items-center gap-1"><Clock className="w-4 h-4" /><span>{meeting.time}</span></div>
                      </div>
                    </div>
                    <Badge variant="outline">מתוכנן</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-lg text-slate-500">
                <p>אין פגישות מתוכננות.</p>
              </div>
            )}
          </div>

          <div className="flex justify-center pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} className="gap-2 text-slate-600 hover:text-slate-800 hover:bg-slate-50">
              <ChevronUp className="w-4 h-4" /><span>סגור פרטים</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}