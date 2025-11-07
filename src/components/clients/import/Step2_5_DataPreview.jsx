
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Table, Eye, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';

const FIELD_LABELS = {
  name: 'שם מלא',
  company: 'חברה', 
  email: 'אימייל',
  phone: 'טלפון',
  address: 'כתובת',
  status: 'סטטוס',
  work_stage: 'שלב עבודה',
  total_value: 'ערך עסקה',
  paid: 'שולם',
  notes: 'הערות',
  source: 'מקור',
  dont_map: 'לא ממופה'
};

export default function Step2_5_DataPreview({ fileData, processedMappings, userWorkStages = [], onBack, onContinue }) {
  const [previewData, setPreviewData] = useState([]);

  // Create lookup maps for display - ודא שuserWorkStages הוא מערך
  const workStageMap = (userWorkStages || []).reduce((acc, stage) => {
    if (stage && stage.id && stage.label) {
      acc[stage.id] = stage.label;
    }
    return acc;
  }, {});

  const statusMap = {
    lead: 'ליד',
    hot_lead: 'ליד חם', 
    client: 'לקוח',
    inactive: 'לא פעיל'
  };

  useEffect(() => {
    // ודא שיש לנו את כל הנתונים הנדרשים לפני העיבוד
    if (!fileData || !fileData.rows || !processedMappings || !processedMappings.mappings) {
      console.log('Missing required data for preview');
      return;
    }

    // Transform the data based on mappings
    const transformedData = fileData.rows.slice(0, 50).map((row, index) => {
      const transformedRow = { originalRowIndex: index + 1 };
      
      // Apply field mappings
      Object.entries(processedMappings.mappings || {}).forEach(([field, header]) => {
        if (header && header !== 'dont_map' && row[header] !== undefined) {
          let value = row[header];
          
          // Apply transformations based on field type
          if (field === 'work_stage' && value) {
            // Apply stage mapping
            const stageMapping = (processedMappings.stageMapping || {})[value];
            if (stageMapping && stageMapping.type === 'existing') {
              value = workStageMap[stageMapping.id] || value;
            } else {
              value = 'פניה ראשונית (ברירת מחדל)';
            }
          } else if (field === 'status' && value) {
            // Normalize status
            const normalizedStatus = normalizeStatus(value);
            value = statusMap[normalizedStatus] || normalizedStatus;
          } else if (field === 'phone' && value) {
            // Normalize phone
            value = normalizePhone(value) || value;
          }
          
          transformedRow[field] = value;
        }
      });
      
      return transformedRow;
    });
    
    setPreviewData(transformedData);
  }, [fileData, processedMappings, workStageMap]);

  // Helper functions (simplified versions)
  const normalizeStatus = (status) => {
    if (!status) return 'lead';
    const str = String(status).toLowerCase().trim();
    if (str.includes('חם') || str.includes('hot')) return 'hot_lead';
    if (str.includes('לקוח') || str.includes('client')) return 'client';
    if (str.includes('לא פעיל') || str.includes('inactive')) return 'inactive';
    return 'lead';
  };

  const normalizePhone = (phone) => {
    if (!phone) return null;
    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('972')) {
      cleanPhone = '0' + cleanPhone.substring(3);
    }
    return cleanPhone;
  };

  // Get mapped fields for column headers - הגנה מפני null/undefined
  const mappedFields = Object.keys(processedMappings?.mappings || {}).filter(
    field => {
      const mapping = processedMappings?.mappings?.[field];
      return mapping && mapping !== 'dont_map';
    }
  );

  // הגנה מפני מקרים שבהם אין נתונים
  if (!fileData || !processedMappings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-slate-500">טוען תצוגה מקדימה...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5 text-blue-600" />
            תצוגה מקדימה של הנתונים
          </CardTitle>
          <p className="text-sm text-slate-600">
            צפה איך הנתונים יופיעו אחרי הייבוא (מוצגים {Math.min(50, previewData.length)} שורות ראשונות מתוך {fileData.totalRows || fileData.rows.length})
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{fileData.totalRows || fileData.rows.length}</div>
                <div className="text-sm text-slate-600">סה"כ שורות</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{mappedFields.length}</div>
                <div className="text-sm text-slate-600">שדות ממופים</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(processedMappings.stageMapping).length}</div>
                <div className="text-sm text-slate-600">שלבי עבודה ממופים</div>
              </div>
            </div>

            {/* Mapped Fields Summary */}
            <div>
              <h4 className="font-medium text-slate-900 mb-2">שדות שיובאו:</h4>
              <div className="flex flex-wrap gap-2">
                {mappedFields.map(field => (
                  <Badge key={field} className="bg-blue-100 text-blue-800 border-blue-200">
                    {FIELD_LABELS[field] || field}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Data Table with Full Scroll */}
            <div className="border rounded-lg">
              <div className="bg-slate-50 p-3 border-b">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-slate-600" />
                  <span className="font-medium text-slate-900">טבלת נתונים</span>
                </div>
              </div>
              
              {/* Scrollable table container */}
              <div className="overflow-auto max-h-96 max-w-full">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-right text-slate-700 font-medium border-l border-slate-300 bg-slate-100">
                        #
                      </th>
                      {mappedFields.map(field => (
                        <th key={field} className="px-3 py-2 text-right text-slate-700 font-medium border-l border-slate-300 bg-slate-100 min-w-[120px]">
                          {FIELD_LABELS[field] || field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, index) => (
                      <tr key={index} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600 border-l border-slate-200 font-mono text-xs bg-slate-50">
                          {row.originalRowIndex}
                        </td>
                        {mappedFields.map(field => (
                          <td key={field} className="px-3 py-2 text-slate-900 border-l border-slate-200 max-w-[200px]">
                            <div className="truncate" title={String(row[field] || '-')}>
                              {row[field] || '-'}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {fileData.rows.length > 50 && (
              <p className="text-xs text-slate-500 text-center">
                * מוצגות רק 50 השורות הראשונות בתצוגה מקדימה. כל הנתונים יובאו בפועל.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          חזור למיפוי
        </Button>
        <Button onClick={onContinue} className="bg-blue-600 hover:bg-blue-700 gap-2">
          <ArrowRight className="w-4 h-4" />
          המשך לאימות
        </Button>
      </div>
    </motion.div>
  );
}
