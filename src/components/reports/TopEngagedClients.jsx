import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Star } from 'lucide-react';

const TopEngagedClients = ({ clients }) => {
  const topEngaged = clients
    .filter(c => c.engagement_score && c.engagement_score > 0)
    .sort((a, b) => (b.engagement_score || 0) - (a.engagement_score || 0))
    .slice(0, 5);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-pink-600" />
          לקוחות עם מעורבות גבוהה
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topEngaged.length > 0 ? (
          <div className="space-y-3">
            {topEngaged.map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{client.name}</div>
                    {client.company && (
                      <div className="text-sm text-slate-500">{client.company}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-bold text-pink-600">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{client.engagement_score}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>אין נתוני מעורבות להצגה</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopEngagedClients;