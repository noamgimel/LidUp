
import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, ArrowRight, ArrowLeft, Info, Plus, Check, AlertCircle, X, ClipboardList, RefreshCw } from 'lucide-react'; // Added RefreshCw import
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton"; // Added Skeleton import

// Import necessary entities for database interaction
import { UserCustomWorkStages } from "@/entities/UserCustomWorkStages";
import { User } from "@/entities/User";

// Define the new comprehensive field options as provided in the outline
const FIELD_OPTIONS = [
  { id: 'dont_map', label: 'אל תמפה', description: 'תתעלם מהעמודה הזו' },
  { id: 'name', label: 'שם מלא', description: 'שם הלקוח המלא (חובה)' },
  { id: 'company', label: 'חברה', description: 'שם החברה' },
  { id: 'email', label: 'אימייל', description: 'כתובת האימייל (חובה)' },
  { id: 'phone', label: 'טלפון', description: 'מספר הטלפון' },
  { id: 'address', label: 'כתובת', description: 'כתובת פיזית' },
  { id: 'status', label: 'סטטוס', description: 'סטטוס הלקוח (ליד, לקוח וכו\')' },
  { id: 'work_stage', label: 'שלב עבודה', description: 'שלב העבודה הנוכחי' },
  { id: 'total_value', label: 'ערך עסקה', description: 'ערך כספי של העסקה' },
  { id: 'paid', label: 'שולם', description: 'סכום ששולם עד כה' },
  { id: 'notes', label: 'הערות', description: 'הערות נוספות' },
  { id: 'source', label: 'מקור', description: 'מקור הליד (פייסבוק, גוגל, הפניה וכו\')'}
];

// Derive the mappable CRM fields from FIELD_OPTIONS for internal use (key, label, required)
const mappableCRMFields = FIELD_OPTIONS
  .filter(field => field.id !== 'dont_map')
  .map(field => ({
    key: field.id,
    label: field.label,
    required: field.description.includes('(חובה)') // Determine required status from description
  }));

// AUTO_MAP_KEYWORDS (updated with 'source' field)
const AUTO_MAP_KEYWORDS = {
  name: ['שם', 'name', 'full_name', 'שם מלא', 'לקוח', 'איש קשר'],
  email: ['אימייל', 'email', 'מייל', 'דוא"ל', 'דואר אלקטרוני'],
  phone: ['טלפון', 'phone', 'נייד', 'פלאפון', 'טל', 'פלפון', 'mobile'],
  company: ['חברה', 'company', 'עסק', 'ארגון', 'עבודה', 'מקום עבודה'],
  status: ['סטטוס', 'status', 'מצב', 'סוג לקוח', 'type'],
  work_stage: ['שלב', 'stage', 'שלב עבודה', 'work_stage', 'מצב עבודה'],
  address: ['כתובת', 'address', 'מיקום', 'רחוב', 'עיר'],
  notes: ['הערות', 'notes', 'הערה', 'תיאור', 'הסבר', 'comment'],
  total_value: ['סכום', 'total_value', 'value', 'price', 'מחיר', 'עסקה'],
  paid: ['שולם', 'paid', 'תשלום', 'amount_paid'],
  source: ['מקור', 'source', 'מאיפה', 'referral', 'marketing', 'from']
};

// COLOR_OPTIONS (retained as it's used for the create stage dialog)
const COLOR_OPTIONS = [
  { value: "blue", label: "כחול", class: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "green", label: "ירוק", class: "bg-green-100 text-green-800 border-green-200" },
  { value: "yellow", label: "צהוב", class: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "orange", label: "כתום", class: "bg-orange-100 text-orange-800 border-orange-200" },
  { value: "red", label: "אדום", class: "bg-red-100 text-red-800 border-red-200" },
  { value: "purple", label: "סגול", class: "bg-purple-100 text-purple-800 border-purple-200" },
  { value: "pink", label: "ורוד", class: "bg-pink-100 text-pink-800 border-pink-200" },
  { value: "gray", label: "אפור", class: "bg-gray-100 text-gray-800 border-gray-200" }
];

export default function Step2_FieldMapping({ fileData, onMappingConfirmed, onBack, userWorkStages, addUserWorkStage, workStagesLoading }) {
  const [mappings, setMappings] = useState({});
  const [stageMapping, setStageMapping] = useState({});
  // No need for uniqueValues state, as uniqueWorkStageValues useMemo handles this.
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('blue');
  const [acknowledgeUnmapped, setAcknowledgeUnmapped] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [currentMappingStageValue, setCurrentMappingStageValue] = useState('');

  // New state variable for validation errors
  const [validationErrors, setValidationErrors] = useState({});

  // Calculate unmapped columns - headers that won't be mapped to any system field
  const unmappedColumns = useMemo(() => {
    // This now correctly identifies headers that are not assigned to any CRM field
    return fileData.headers.filter(header =>
      !Object.values(mappings).includes(header)
    );
  }, [fileData.headers, mappings]);


  const unmappedPercentage = useMemo(() => {
    const mappedCount = Object.values(mappings).filter(v => v && v !== 'dont_map').length;
    return Math.round(((fileData.headers.length - mappedCount) / fileData.headers.length) * 100);
  }, [mappings, fileData.headers.length]);

  const requiresAcknowledgment = unmappedColumns.length > 3 || unmappedPercentage > 30;

  // Get preview rows without any status transformations (management removed)
  const previewRows = useMemo(() => {
    return fileData.rows.slice(0, 5).map(row => ({ ...row }));
  }, [fileData.rows]);


  // Initialize mappings with auto-detection (uses mappableCRMFields)
  useEffect(() => {
    const initialMappings = {};

    mappableCRMFields.forEach(field => {
      // Try to find a matching header for this field
      const matchingHeader = fileData.headers.find(header =>
        AUTO_MAP_KEYWORDS[field.key].some(keyword =>
          header.toLowerCase().trim().includes(keyword.toLowerCase())
        )
      );

      initialMappings[field.key] = matchingHeader || 'dont_map';
    });

    setMappings(initialMappings);
  }, [fileData.headers]);

  // Work stage logic
  const uniqueWorkStageValues = useMemo(() => {
    const workStageHeader = mappings.work_stage;
    if (!workStageHeader || workStageHeader === 'dont_map') return [];

    const values = new Set();
    fileData.rows.forEach(row => {
      const value = row[workStageHeader];
      if (value && value.trim()) {
        values.add(value.trim());
      }
    });
    return Array.from(values);
  }, [fileData.rows, mappings.work_stage]);

  // This memoized value is for displaying current unmapped stages, not for validation state
  const currentUnmappedStagesForDisplay = useMemo(() => {
    return uniqueWorkStageValues.filter(value => !stageMapping[value] || stageMapping[value].type === 'unmapped');
  }, [uniqueWorkStageValues, stageMapping]);

  // Auto-map work stages
  useEffect(() => {
    if (uniqueWorkStageValues.length > 0) {
      const newStageMapping = { ...stageMapping };

      uniqueWorkStageValues.forEach(value => {
        if (!newStageMapping[value]) {
          const matchingStage = userWorkStages.find(stage =>
            stage.label.toLowerCase().trim() === value.toLowerCase().trim()
          );

          if (matchingStage) {
            newStageMapping[value] = { type: 'existing', id: matchingStage.id, label: matchingStage.label };
          }
        }
      });

      setStageMapping(newStageMapping);
    }
  }, [uniqueWorkStageValues, userWorkStages]);

  const handleMappingChange = (fieldKey, headerValue) => {
    setMappings(prev => {
      const newMappings = { ...prev };

      // If mapping to a file header, check for duplicates
      if (headerValue !== 'dont_map') {
        // Clear any other field that was mapped to this header
        Object.keys(newMappings).forEach(key => {
          if (key !== fieldKey && newMappings[key] === headerValue) {
            newMappings[key] = 'dont_map';
          }
        });
      }

      newMappings[fieldKey] = headerValue;
      return newMappings;
    });

    // Clear any validation errors for this specific field
    setValidationErrors(prev => ({ ...prev, [fieldKey]: undefined }));
  };

  // Handle creating new work stage - תיקון השימוש בפונקציות
  const handleCreateStage = async () => {
    if (!newStageName || !String(newStageName).trim()) {
      toast({
        title: "שגיאה",
        description: "אנא הכנס שם לשלב העבודה",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingStage(true);
    try {
      // Use the function passed from the parent component
      const newStage = await addUserWorkStage(
        newStageName.trim(),
        newStageColor,
        `נוצר אוטומטית מייבוא ${fileData.name}`
      );

      console.log('New stage created:', newStage);

      if (newStage && newStage.id) {
        // The parent component is expected to re-render with the updated userWorkStages
        // after this function completes and the parent's state updates.
        if (currentMappingStageValue) {
          setStageMapping(prev => ({
            ...prev,
            [currentMappingStageValue]: {
              type: 'existing',
              id: newStage.id,
              label: newStage.label // Use the correct label returned from the new stage
            }
          }));

          // Remove the error if it was present
          setValidationErrors(prev => ({
            ...prev,
            unmappedStages: prev.unmappedStages?.filter(v => v !== currentMappingStageValue) || []
          }));
        }

        // Show success toast
        toast({
          title: "שלב עבודה נוצר בהצלחה!",
          description: `השלב "${newStage.label}" נוצר ונוסף למערכת`,
          className: "bg-green-100 text-green-900 border-green-200",
        });

        // Close dialog and clear state
        setShowCreateStageDialog(false);
        setNewStageName('');
        setNewStageColor('blue');
        setCurrentMappingStageValue('');

      } else {
        throw new Error("לא התקבל שלב עבודה חדש מהשרת.");
      }

    } catch (error) {
      console.error('Error creating stage:', error);
      toast({
        title: "שגיאה ביצירת שלב עבודה",
        description: error.message || "אירעה שגיאה בלתי צפויה",
        variant: "destructive",
      });
    } finally {
      setIsCreatingStage(false);
    }
  };

  // Function to reset mapping selection
  const resetStageMapping = (originalValue) => {
    setStageMapping(prev => {
      const updated = { ...prev };
      delete updated[originalValue];
      return updated;
    });
  };

  // Validation function before proceeding
  const validateAndProceed = () => {
    const errors = {};

    // Check required fields
    if (!mappings.name || mappings.name === 'dont_map') {
      errors.name = 'שדה שם הוא חובה';
    }

    if (!mappings.email || mappings.email === 'dont_map') {
      errors.email = 'שדה אימייל הוא חובה';
    }

    // Check unmapped work stages
    const unmappedStages = uniqueWorkStageValues.filter(value =>
      value && value.trim() && !stageMapping[value]
    );

    if (unmappedStages.length > 0) {
      errors.unmappedStages = unmappedStages;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);

      // Scroll to the first unmapped stage if there are any
      if (errors.unmappedStages && errors.unmappedStages.length > 0) {
        const firstUnmapped = errors.unmappedStages[0];
        const element = document.querySelector(`[data-stage-value="${firstUnmapped}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      return;
    }

    // If all is well, proceed to preview
    const processedMappings = {
      mappings: mappings, // Pass the full mappings object including 'dont_map'
      stageMapping: stageMapping,
      // Recalculate unmappedColumns based on what's *not* a value in mappings
      unmappedColumns: fileData.headers.filter(header =>
        !Object.values(mappings).includes(header)
      )
    };

    setValidationErrors({}); // Clear errors on success
    onMappingConfirmed(processedMappings);
  };

  // Update validation when work stage mapping changes
  useEffect(() => {
    if (validationErrors.unmappedStages) {
      const workStageValues = uniqueWorkStageValues;
      const stillUnmapped = workStageValues.filter(value =>
        value && value.trim() && !stageMapping[value]
      );

      if (stillUnmapped.length !== validationErrors.unmappedStages.length ||
          !stillUnmapped.every(val => validationErrors.unmappedStages.includes(val))) { // Basic check for array content change
        setValidationErrors(prev => ({
          ...prev,
          unmappedStages: stillUnmapped.length > 0 ? stillUnmapped : undefined
        }));
      }
    }
  }, [stageMapping, mappings.work_stage, uniqueWorkStageValues, validationErrors.unmappedStages]);


  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full rtl-text"
    >
      <div className="flex-grow overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">מיפוי שדות</h3>
          <div className="text-sm text-slate-500">
            {fileData.totalRows || fileData.rows.length} שורות בקובץ
          </div>
        </div>

        {/* Field Mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">מיפוי שדות מערכת</CardTitle>
            <p className="text-sm text-slate-600">
              בחר עבור כל שדה מערכת איזו עמודה מהקובץ תתאים לו
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mappableCRMFields.map(field => (
                <div key={field.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </Label>
                    {mappings[field.key] && mappings[field.key] !== 'dont_map' && (
                      <div className="text-xs text-slate-500">
                        דוגמאות: {fileData.rows.slice(0, 3).map(row => row[mappings[field.key]]).filter(v => v !== null && v !== undefined && String(v).trim() !== '').join(', ').substring(0, 30)}...
                      </div>
                    )}
                  </div>
                  <Select
                    value={mappings[field.key] || 'dont_map'}
                    onValueChange={(value) => handleMappingChange(field.key, value)}
                  >
                    <SelectTrigger className={`text-right ${validationErrors[field.key] ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="בחר עמודה מהקובץ" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="dont_map">אל תמפה (דלג)</SelectItem>
                      {fileData.headers.map(header => (
                        <SelectItem
                          key={header}
                          value={header}
                          className="text-right"
                        >
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Work Stage Mapping */}
        {mappings.work_stage && mappings.work_stage !== 'dont_map' && uniqueWorkStageValues.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-purple-600" />
                מיפוי שלבי עבודה
              </CardTitle>
              {validationErrors.unmappedStages && validationErrors.unmappedStages.length > 0 && (
                <p className="text-red-600 text-sm">
                  יש {validationErrors.unmappedStages.length} שלבי עבודה שטרם מופו. אנא מפה אותם כדי להמשיך.
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {workStagesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                uniqueWorkStageValues.map(originalValue => {
                  const isError = validationErrors.unmappedStages?.includes(originalValue);
                  const currentMapping = stageMapping[originalValue];

                  return (
                    <div
                      key={originalValue}
                      className={`p-3 rounded-lg border ${isError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}
                      data-stage-value={originalValue}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-slate-700">ערך בקובץ:</div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            "{originalValue}"
                          </Badge>
                        </div>

                        {/* If already mapped, show edit option */}
                        {currentMapping && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resetStageMapping(originalValue)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 ml-1" /> {/* Adjusted to ml-1 for RTL */}
                            שנה מיפוי
                          </Button>
                        )}
                      </div>

                      {!currentMapping ? (
                                // If no mapping, show all options
                                <div className="space-y-2">
                                  <div className="text-xs text-slate-500 mb-2">בחר מיפוי:</div>

                                  {/* Existing work stages */}
                                  {userWorkStages && userWorkStages.length > 0 && (
                                    <div className="space-y-1">
                                      <div className="text-xs font-medium text-slate-600 mb-1">שלבי עבודה קיימים במערכת:</div>
                                      <div className="flex flex-wrap gap-2">
                                        {userWorkStages.map(stage => (
                                          <Button
                                            key={stage.id}
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setStageMapping(prev => ({
                                                ...prev,
                                                [originalValue]: {
                                                  type: 'existing',
                                                  id: stage.id,
                                                  label: stage.label
                                                }
                                              }));
                                              // Remove error if present
                                              if (isError) {
                                                setValidationErrors(prev => ({
                                                  ...prev,
                                                  unmappedStages: prev.unmappedStages?.filter(v => v !== originalValue) || []
                                                }));
                                              }
                                            }}
                                            className="text-xs bg-white hover:bg-green-50 border-green-200 hover:border-green-300 text-green-700"
                                          >
                                            <Check className="w-3 h-3 ml-1" /> {/* Adjusted to ml-1 for RTL */}
                                            {stage.label}
                                          </Button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Create new stage button */}
                                  <div className="pt-2 border-t border-slate-200">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setCurrentMappingStageValue(originalValue);
                                        setShowCreateStageDialog(true);
                                      }}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                                    >
                                      <Plus className="w-4 h-4 ml-1" /> {/* Adjusted to ml-1 for RTL */}
                                      צור שלב עבודה חדש
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                // If mapped, display it
                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                                  <Check className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-700">
                                    ממופה ל: <strong>{currentMapping.label}</strong>
                                  </span>
                                </div>
                              )}
                      {isError && (
                        <p className="text-red-600 text-sm mt-2">
                          שלב עבודה זה חייב להיות ממופה כדי להמשיך
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {/* Unmapped Columns Warning */}
        {unmappedColumns.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                <Info className="w-4 h-4" />
                עמודות שלא ימופו (דילוג)
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-orange-700">
              <p className="mb-3">
                העמודות הבאות אינן ממופות לשדות מערכת ולכן יידלגו בתהליך הייבוא. זה לא יעצור את הייבוא.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {unmappedColumns.slice(0, 10).map(col => (
                  <Badge key={col} variant="outline" className="bg-white text-orange-800 border-orange-300">
                    {col}
                  </Badge>
                ))}
                {unmappedColumns.length > 10 && (
                  <Badge variant="outline" className="bg-white text-orange-800 border-orange-300">
                    +{unmappedColumns.length - 10} נוספות
                  </Badge>
                )}
              </div>

              {requiresAcknowledgment && (
                <div className="flex items-start gap-3 p-3 bg-orange-100 rounded-lg border border-orange-300">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="font-medium text-orange-800 mb-2">זוהו עמודות רבות שלא ימופו</p>
                    <p className="text-sm mb-3">
                      {unmappedColumns.length} מתוך {fileData.headers.length} עמודות ({unmappedPercentage}%) לא ימופו.
                      ייתכן שמידע חלקי לא ייכנס.
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="acknowledge-unmapped"
                        checked={acknowledgeUnmapped}
                        onCheckedChange={setAcknowledgeUnmapped}
                      />
                      <Label htmlFor="acknowledge-unmapped" className="text-sm font-medium cursor-pointer">
                        קיבלתי שעמודות אלו יידלגו
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          חזור
        </Button>
        <div className="space-y-2 text-left">
          {validationErrors.name && (
            <p className="text-red-600 text-sm">יש למפות את שדה השם</p>
          )}
          {validationErrors.email && (
            <p className="text-red-600 text-sm">יש למפות את שדה האימייל</p>
          )}
          <Button
            onClick={validateAndProceed}
            className="bg-gradient-to-l from-blue-600 to-blue-700 gap-2"
            disabled={!mappings.name || !mappings.email || (requiresAcknowledgment && !acknowledgeUnmapped)}
          >
            <span>תצוגה מקדימה</span>
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dialog for creating new stage */}
      <Dialog open={showCreateStageDialog} onOpenChange={setShowCreateStageDialog}>
        <DialogContent dir="rtl" className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>יצירת שלב עבודה חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newStageName">שם השלב</Label>
              <Input
                id="newStageName"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="הכנס שם לשלב העבודה"
                className="text-right"
                disabled={isCreatingStage}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newStageColor">צבע השלב</Label>
              <Select 
                value={newStageColor} 
                onValueChange={setNewStageColor}
                disabled={isCreatingStage}
              >
                <SelectTrigger className="text-right">
                  <SelectValue placeholder="בחר צבע" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {COLOR_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-right">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${option.class.split(' ')[0]} border`}></div>
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <DialogFooter className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateStageDialog(false);
                  setNewStageName('');
                  setNewStageColor('blue');
                  setCurrentMappingStageValue('');
                }}
                disabled={isCreatingStage}
              >
                ביטול
              </Button>
              <Button 
                onClick={handleCreateStage} 
                disabled={isCreatingStage || !String(newStageName).trim()}
                className="bg-gradient-to-l from-purple-600 to-purple-700"
              >
                {isCreatingStage ? (
                  <>
                    <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
                    יוצר...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 ml-2" />
                    צור שלב
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
