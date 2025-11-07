import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, Phone, Video, MapPin, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const meetingTypeIcons = {
  phone: Phone,
  video: Video,
  in_person: MapPin
};

const meetingTypeLabels = {
  phone: "טלפון",
  video: "וידאו",
  in_person: "פגישה פרונטלית"
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  rescheduled: "bg-yellow-100 text-yellow-800 border-yellow-200"
};

const statusLabels = {
  scheduled: "מתוכנן",
  completed: "הושלם",
  cancelled: "בוטל",
  rescheduled: "נדחה"
};

// Helper function to format date in Israel timezone
const formatIsraeliDate = (dateString, formatString = 'dd/MM') => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Add 3 hours to convert UTC to Israel time (UTC+3 for daylight saving time)
    const israelDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    
    return format(israelDate, formatString, { locale: he });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

export default function UpcomingMeetings({ meetings, isLoading }) {
  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.date) >= new Date() && meeting.status === 'scheduled')
    .slice(0, 3);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Calendar className="w-5 h-5 text-purple-600" />
          פגישות קרובות
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="p-4 border border-slate-100 rounded-lg">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          ) : upcomingMeetings.length > 0 ? (
            <>
              <div className="divide-y divide-slate-100">
                {upcomingMeetings.map((meeting, index) => {
                  const TypeIcon = meetingTypeIcons[meeting.type];
                  return (
                    <motion.div
                      key={meeting.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-6 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-900 mb-1">{meeting.title}</h4>
                          <p className="text-sm text-slate-600 mb-2">{meeting.client_name}</p>
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatIsraeliDate(meeting.date)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{meeting.time}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TypeIcon className="w-3 h-3" />
                              <span>{meetingTypeLabels[meeting.type]}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={`${statusColors[meeting.status]} border`}>
                          {statusLabels[meeting.status]}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {/* Button at bottom */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                <Link to={createPageUrl("Meetings")}>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    כל הפגישות
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">אין פגישות קרובות</h3>
              <p className="text-slate-500 mb-4">תכנן את הפגישה הבאה שלך</p>
              <Link to={createPageUrl("Meetings")}>
                <Button className="bg-gradient-to-r from-purple-600 to-purple-700">
                  קבע פגישה
                </Button>
              </Link>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}