
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowLeft, CheckCircle, Download, Loader2, BarChart, RefreshCw, Upload, Check, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const convertToCSV = (data, headers) => {
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

export default function Step3_ReviewAndImport({ fileData, processedMappings, onImport, isImporting, importResults, onBack, onFinish }) {
    const { toast } = useToast();
    const [overwrite, setOverwrite] = useState(false);
    const [summary, setSummary] = useState({
        totalRows: 0,
        validRows: 0,
        errorRows: 0,
        estimatedNew: 0,
        estimatedUpdates: 0
    });

    useEffect(() => {
        // Calculate summary based on mappings and data
        const validRows = fileData.rows.filter(row => {
            const nameHeader = processedMappings.mappings.name;
            return nameHeader && row[nameHeader] && row[nameHeader].trim();
        });

        const errorRows = fileData.rows.filter(row => {
            const nameHeader = processedMappings.mappings.name;
            
            if (!nameHeader || !row[nameHeader] || !row[nameHeader].trim()) {
                return true;
            }
            
            const emailHeader = processedMappings.mappings.email;
            if (emailHeader && row[emailHeader]) {
                const email = row[emailHeader].trim();
                if (email && !/\S+@\S+\.\S+/.test(email)) {
                    return true;
                }
            }
            
            return false;
        });

        setSummary({
            totalRows: fileData.totalRows || fileData.rows.length,
            validRows: validRows.length,
            errorRows: errorRows.length,
            estimatedNew: Math.floor(validRows.length * 0.8),
            estimatedUpdates: Math.floor(validRows.length * 0.2)
        });
    }, [fileData, processedMappings]);

    const handleImport = (shouldOverwrite) => {
        if (onImport && typeof onImport === 'function') {
            onImport(shouldOverwrite);
        } else {
            console.error('onImport function not provided or not a function');
            toast({
                title: "שגיאה",
                description: "שגיאה פנימית - צור קשר עם התמיכה",
                variant: "destructive"
            });
        }
    };
    
    const downloadErrorFile = () => {
        if (!importResults || !importResults.errors || importResults.errors.length === 0) return;

        const dataToExport = importResults.errors.map(err => ({
            ...err.rowData,
            'סיבת_שגיאה': err.reason
        }));

        const headers = Object.keys(dataToExport[0]);
        const csvString = convertToCSV(dataToExport, headers);
        
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `LidUp_Import_Errors_${fileData.name}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const hasConflicts = summary.estimatedUpdates > 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full rtl-text"
        >
            {isImporting && !importResults && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
                    <h3 className="text-xl font-semibold mb-4">מייבא לקוחות...</h3>
                    <p className="text-slate-600 mb-6">זה עשוי לקחת מספר רגעים. אנא המתן...</p>
                    <Progress value={50} className="w-full max-w-md" />
                    <p className="text-sm text-slate-500 mt-2">מעבד נתונים...</p>
                </div>
            )}

            {!isImporting && importResults && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                    <h3 className="text-2xl font-semibold mb-4 text-green-800">הייבוא הושלם בהצלחה!</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-6">
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-700">{importResults.created}</div>
                                <div className="text-sm text-green-600">לקוחות נוצרו</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-700">{importResults.updated}</div>
                                <div className="text-sm text-blue-600">לקוחות עודכנו</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-50 border-orange-200">
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-orange-700">{importResults.skipped}</div>
                                <div className="text-sm text-orange-600">שורות דולגו</div>
                            </CardContent>
                        </Card>
                    </div>

                    {importResults.errors && importResults.errors.length > 0 && (
                        <Card className="w-full max-w-2xl mb-6 bg-red-50 border-red-200">
                            <CardHeader>
                                <CardTitle className="text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    שגיאות ({importResults.errors.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button onClick={downloadErrorFile} variant="outline" className="gap-2">
                                    <Download className="w-4 h-4" />
                                    הורד קובץ שגיאות
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {processedMappings.unmappedColumns && processedMappings.unmappedColumns.length > 0 && (
                        <Card className="w-full max-w-2xl mb-6 bg-orange-50 border-orange-200">
                            <CardHeader>
                                <CardTitle className="text-orange-800">עמודות שדולגו</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {processedMappings.unmappedColumns.map(col => (
                                        <Badge key={col} variant="outline" className="bg-white text-orange-800 border-orange-300">
                                            {col}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="w-full flex justify-center">
                        <Button 
                            onClick={() => {
                                // הצגת הודעת הצלחה
                                toast({
                                  title: "הייבוא הושלם בהצלחה!",
                                  description: "הלקוחות יוצאו למערכת וניתן לצפות בהם ברשימת הלקוחות",
                                  className: "bg-green-100 text-green-900 border-green-200",
                                });
                                
                                // סגירת האשף
                                onFinish();
                            }} 
                            className="bg-gradient-to-l from-green-600 to-green-700 gap-2"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            סיום וחזרה לרשימת הלקוחות
                        </Button>
                    </div>
                </div>
            )}

            {!isImporting && !importResults && (
                <div className="space-y-6 w-full max-w-2xl mx-auto py-6 px-4">
                    {/* Header */}
                    <div>
                        <h3 className="text-lg font-semibold mb-2">סיכום לפני ייבוא</h3>
                        <p className="text-slate-600">
                            בדוק את הפרטים לפני שתתחיל בתהליך הייבוא
                        </p>
                    </div>

                    {/* Mapping Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">סיכום מיפוי</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(processedMappings.mappings).map(([field, header]) => (
                                <div key={field} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                                    <span className="font-medium">{field}</span>
                                    <span className="text-slate-600">← {header}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Statistics */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-slate-900">{summary.totalRows}</div>
                                <div className="text-sm text-slate-600">סה"כ שורות</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-green-600">{summary.validRows}</div>
                                <div className="text-sm text-slate-600">שורות תקינות</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-blue-600">{summary.estimatedNew}</div>
                                <div className="text-sm text-slate-600">צפוי ליצור</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4 text-center">
                                <div className="text-2xl font-bold text-orange-600">{summary.estimatedUpdates}</div>
                                <div className="text-sm text-slate-600">צפוי לעדכן</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Unmapped Columns */}
                    {processedMappings.unmappedColumns && processedMappings.unmappedColumns.length > 0 && (
                        <Card className="bg-orange-50 border-orange-200">
                            <CardHeader>
                                <CardTitle className="text-orange-800">עמודות שיידלגו</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-orange-700 mb-3">
                                    העמודות הבאות לא ימופו ולא ייכנסו למערכת:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {processedMappings.unmappedColumns.map(col => (
                                        <Badge key={col} variant="outline" className="bg-white text-orange-800 border-orange-300">
                                            {col}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">אפשרויות ייבוא</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Checkbox 
                                    id="overwrite"
                                    checked={overwrite}
                                    onCheckedChange={setOverwrite}
                                />
                                <label htmlFor="overwrite" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    דרוס נתונים קיימים אם נמצא לקוח עם אותו אימייל או טלפון
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Buttons */}
                    <div className="flex justify-between pt-6">
                        <Button variant="outline" onClick={onBack} disabled={isImporting}>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            חזור
                        </Button>
                        <div className="flex gap-3">
                            <Button
                                onClick={() => handleImport(false)}
                                disabled={isImporting}
                                className="bg-gradient-to-l from-blue-600 to-blue-700"
                            >
                                {isImporting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        מייבא נתונים...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4 mr-2" />
                                        התחל ייבוא
                                    </>
                                )}
                            </Button>
                            {hasConflicts && (
                                <Button
                                    onClick={() => handleImport(true)}
                                    disabled={isImporting}
                                    variant="outline"
                                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                    ייבא עם החלפה
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
