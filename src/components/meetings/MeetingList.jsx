
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, Trash2, Clock, Phone, Video, MapPin, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const meetingTypeIcons = {
  phone: Phone,
  video: Video,
  in_person: MapPin
};

const meetingTypeLabels = {
  phone: "טלפון",
  video: "וידאו",
  in_person: "פרונטלית"
};

const statusColors = {
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200"
};

const statusLabels = {
  scheduled: "מתוכנן",
  completed: "הושלם"
};

export default function MeetingList({ meetings, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array(5).fill(0).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 mb-2">אין פגישות</h3>
          <p className="text-slate-500">התחל על ידי קביעת הפגישה הראשונה שלך</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {meetings.map((meeting, index) => {
          const TypeIcon = meetingTypeIcons[meeting.type];
          const isUpcoming = new Date(`${meeting.date}T${meeting.time}`) >= new Date();
          
          return (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`shadow-sm border-slate-200 hover:shadow-md transition-all duration-200 ${
                isUpcoming && meeting.status === 'scheduled' ? 'border-r-4 border-r-blue-500' : ''
              }`}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1 text-right">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">{meeting.title}</h3>
                          <p className="text-slate-600">{meeting.client_name}</p>
                        </div>
                        <Badge className={`${statusColors[meeting.status]} border whitespace-nowrap`}>
                          {statusLabels[meeting.status]}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3 mt-3">
                        <div className="flex items-center justify-start gap-1.5">
                           <Calendar className="w-4 h-4 text-slate-400" />
                           <span>{format(new Date(meeting.date), 'dd MMMM yyyy', { locale: he })}</span>
                           <span className="text-slate-300 mx-1">|</span>
                           <Clock className="w-4 h-4 text-slate-400" />
                           <span>{meeting.time}</span>
                           {meeting.duration && <span>({meeting.duration} דקות)</span>}
                        </div>
                         <div className="flex items-center justify-start gap-1.5">
                            <TypeIcon className="w-4 h-4 text-slate-400" />
                            <span>{meetingTypeLabels[meeting.type]}</span>
                            {meeting.location && (
                                <>
                                    <span className="text-slate-300 mx-1">|</span>
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    <span>{meeting.location}</span>
                                </>
                            )}
                         </div>
                      </div>
                      
                      {meeting.notes && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-lg text-right">
                          <p className="text-sm text-slate-700">{meeting.notes}</p>
                        </div>
                      )}
                      {meeting.outcome && meeting.status === 'completed' && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 text-right">
                          <p className="text-sm text-green-800 font-medium mb-1">תוצאות הפגישה:</p>
                          <p className="text-sm text-green-700">{meeting.outcome}</p>
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(meeting)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(meeting.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
