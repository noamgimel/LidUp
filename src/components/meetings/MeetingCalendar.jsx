import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, Phone, Video, MapPin } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const meetingTypeIcons = {
  phone: Phone,
  video: Video,
  in_person: MapPin
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rescheduled: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

export default function MeetingCalendar({ meetings, selectedDate, onDateSelect, onMeetingEdit }) {
  const meetingDates = meetings.map(meeting => new Date(meeting.date));
  
  const dayMeetings = meetings.filter(meeting => 
    format(new Date(meeting.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
  );

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <CalendarIcon className="w-5 h-5 text-purple-600" />
          יומן פגישות
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={onDateSelect}
              className="rounded-md border"
              modifiers={{
                hasMeeting: meetingDates
              }}
              modifiersStyles={{
                hasMeeting: {
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  fontWeight: 'bold'
                }
              }}
            />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">
              פגישות ב-{format(selectedDate, 'dd MMMM yyyy', { locale: he })}
            </h4>
            {dayMeetings.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {dayMeetings
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((meeting) => {
                    const TypeIcon = meetingTypeIcons[meeting.type];
                    return (
                      <div
                        key={meeting.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => onMeetingEdit(meeting)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-slate-900">{meeting.title}</h5>
                          <Badge className={`${statusColors[meeting.status]} border text-xs`}>
                            {meeting.status === 'scheduled' ? 'מתוכנן' : 
                             meeting.status === 'completed' ? 'הושלם' :
                             meeting.status === 'cancelled' ? 'בוטל' : 'נדחה'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{meeting.client_name}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{meeting.time}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <TypeIcon className="w-3 h-3" />
                            <span>
                              {meeting.type === 'phone' ? 'טלפון' :
                               meeting.type === 'video' ? 'וידאו' : 'פרונטלית'}
                            </span>
                          </div>
                          {meeting.duration && (
                            <span>({meeting.duration} דקות)</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>אין פגישות ביום זה</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}