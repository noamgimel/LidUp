import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfWeek, startOfMonth, startOfDay, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Users, Zap, Settings2 } from 'lucide-react';

const statusOptions = [
  { value: "lead", label: "ליד" },
  { value: "hot_lead", label: "ליד חם" },
  { value: "client", label: "לקוח" },
  { value: "inactive", label: "לא פעיל" }
];

export default function LeadsClientsTrendChart({ clients }) {
  const [dataType, setDataType] = useState('both'); // 'leads', 'clients', 'both'
  const [timeGroup, setTimeGroup] = useState('week'); // 'day', 'week', 'month'
  const [selectedStatuses, setSelectedStatuses] = useState(statusOptions.map(s => s.value));

  const chartData = useMemo(() => {
    const filteredClients = clients.filter(c => selectedStatuses.includes(c.status));
    
    const groupedData = {};

    filteredClients.forEach(client => {
      if (!client.created_date) return;
      
      const date = parseISO(client.created_date);
      let key;
      let name;

      if (timeGroup === 'day') {
        key = format(startOfDay(date), 'yyyy-MM-dd');
        name = format(startOfDay(date), 'd MMM', { locale: he });
      } else if (timeGroup === 'week') {
        key = format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd'); // Sunday start
        name = `שבוע ${format(startOfWeek(date, { weekStartsOn: 0 }), 'dd/MM')}`;
      } else { // month
        key = format(startOfMonth(date), 'yyyy-MM-dd');
        name = format(startOfMonth(date), 'MMM yy', { locale: he });
      }

      if (!groupedData[key]) {
        groupedData[key] = { name, 'לידים': 0, 'לקוחות': 0 };
      }

      if (client.status === 'lead' || client.status === 'hot_lead') {
        groupedData[key]['לידים']++;
      } else if (client.status === 'client') {
        groupedData[key]['לקוחות']++;
      }
    });

    return Object.values(groupedData).sort((a, b) => new Date(a.name.split(' ')[1] ? a.name.split(' ')[1].split('/').reverse().join('-') : a.name) - new Date(b.name.split(' ')[1] ? b.name.split(' ')[1].split('/').reverse().join('-') : b.name));

  }, [clients, timeGroup, selectedStatuses]);

  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            מגמת לקוחות ולידים
          </CardTitle>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <div className="flex bg-slate-100 p-1 rounded-lg border">
                <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimeGroup('day')}
                    className={`rounded-md px-3 py-1.5 transition-all ${timeGroup === 'day' ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    יומי
                </Button>
                <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimeGroup('week')}
                    className={`rounded-md px-3 py-1.5 transition-all ${timeGroup === 'week' ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    שבועי
                </Button>
                <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => setTimeGroup('month')}
                    className={`rounded-md px-3 py-1.5 transition-all ${timeGroup === 'month' ? 'bg-white text-blue-700 shadow' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    חודשי
                </Button>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="border bg-white h-9 w-9">
                        <Settings2 className="w-4 h-4 text-slate-600" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" dir="rtl">
                  <DropdownMenuLabel>הצג סטטוסים</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {statusOptions.map(option => (
                    <DropdownMenuCheckboxItem
                      key={option.value}
                      checked={selectedStatuses.includes(option.value)}
                      onCheckedChange={(checked) => {
                        setSelectedStatuses(prev => 
                          checked ? [...prev, option.value] : prev.filter(s => s !== option.value)
                        );
                      }}
                    >
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  labelStyle={{ color: '#333' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                {(dataType === 'leads' || dataType === 'both') && (
                  <Line type="monotone" dataKey="לידים" stroke="#f97316" strokeWidth={2} activeDot={{ r: 8 }} />
                )}
                {(dataType === 'clients' || dataType === 'both') && (
                  <Line type="monotone" dataKey="לקוחות" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>אין נתונים להצגה עבור הפילטרים שנבחרו</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-center mt-6 pt-6 border-t border-slate-100">
            <Button 
              size="sm"
              variant={dataType === 'both' ? 'default' : 'outline'} 
              onClick={() => setDataType('both')}
              className="min-w-[80px]"
            >
              שניהם
            </Button>
            <Button 
              size="sm"
              variant={dataType === 'leads' ? 'default' : 'outline'} 
              onClick={() => setDataType('leads')}
              className="min-w-[80px]"
            >
              לידים
            </Button>
            <Button 
              size="sm"
              variant={dataType === 'clients' ? 'default' : 'outline'} 
              onClick={() => setDataType('clients')}
              className="min-w-[80px]"
            >
              לקוחות
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}