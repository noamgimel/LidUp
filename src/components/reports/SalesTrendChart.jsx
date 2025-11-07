import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react';

const SalesTrendChart = ({ clients }) => {
  const processDataForChart = () => {
    const salesByMonth = {};

    clients.forEach(client => {
      if (client.created_date && (client.paid || 0) > 0) {
        const monthKey = format(startOfMonth(new Date(client.created_date)), 'yyyy-MM');
        if (!salesByMonth[monthKey]) {
          salesByMonth[monthKey] = 0;
        }
        salesByMonth[monthKey] += (client.paid || 0);
      }
    });

    return Object.keys(salesByMonth)
      .sort()
      .map(monthKey => ({
        name: format(new Date(monthKey), 'MMM yy', { locale: he }),
        'הכנסה חודשית': salesByMonth[monthKey],
      }));
  };

  const chartData = processDataForChart();

  return (
    <Card className="shadow-sm border-slate-200 hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          מגמת הכנסה חודשית
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <Tooltip
                  formatter={(value) => [`₪${value.toLocaleString()}`, 'הכנסה חודשית']}
                  labelStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                  itemStyle={{ fontWeight: 'bold', color: '#4f46e5' }}
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="הכנסה חודשית" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]}
                  stroke="#3730a3"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-lg font-medium mb-2">אין מספיק נתונים להצגת גרף מגמה</p>
            <p className="text-sm">הוסף תשלומים כדי לראות את מגמת ההכנסות</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesTrendChart;