
import React, { useState } from 'react';
import Step1_UploadFile from './Step1_UploadFile';
import Step2_FieldMapping from './Step2_FieldMapping';
import Step2_5_DataPreview from './Step2_5_DataPreview'; // New import
import Step3_ReviewAndImport from './Step3_ReviewAndImport';
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "@/components/ui/use-toast";
import { importClients } from '@/functions/importClients';
import { useUserWorkStages } from '../../hooks/useUserWorkStages'; // New import for fetching work stages

const steps = [
  { id: 1, title: 'העלאת קובץ', description: 'בחר והעלה קובץ CSV או Excel.' },
  { id: 2, title: 'מיפוי שדות', description: 'שייך את העמודות בקובץ לשדות במערכת.' },
  { id: 2.5, title: 'תצוגה מקדימה', description: 'צפה בנתונים לפני הייבוא.' }, // New step
  { id: 3, title: 'אימות וייבוא', description: 'בדוק את הסיכום והתחל בייבוא.' },
];

export default function ClientImportWizard({ onClose, onFinish }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [fileData, setFileData] = useState({
    name: '',
    rows: [],
    headers: [],
    file_url: '',
  });
  const [processedMappings, setProcessedMappings] = useState({});
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Fetch work stages using the custom hook
  const { userWorkStages, addUserWorkStage, isLoading: stagesLoading } = useUserWorkStages();

  const handleFileUploaded = (data) => {
    console.log('File uploaded:', data);
    setFileData(data);
    setCurrentStep(2);
  };

  const handleMappingConfirmed = (confirmedMappings) => {
    console.log('Mappings confirmed:', confirmedMappings);
    setProcessedMappings(confirmedMappings);
    setCurrentStep(2.5); // Navigate to the new preview step
  };

  // New handler for confirming the data preview
  const handlePreviewConfirmed = () => {
    setCurrentStep(3); // Navigate to the final review and import step
  };

  const handleGoBack = () => {
    if (currentStep === 2.5) { // If on the preview step, go back to mapping
      setCurrentStep(2);
    } else if (currentStep > 1) { // For other steps, go back one step
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImport = async (overwritePolicy = false) => {
    console.log('Starting import with:', { 
      mappings: processedMappings.mappings, 
      stageMapping: processedMappings.stageMapping,
      overwritePolicy 
    });
    
    setIsImporting(true);
    setImportResults(null);
    
    try {
      const { data, error } = await importClients({
        file_url: fileData.file_url,
        fileName: fileData.name,
        mappings: processedMappings.mappings || {},
        stageMapping: processedMappings.stageMapping || {},
        overwritePolicy: overwritePolicy
      });

      console.log('Import response:', { data, error });

      if (error) {
        throw new Error(error.message || "Import failed due to server error.");
      }

      if (!data || !data.success) {
        throw new Error(data?.details || "Import failed due to an unknown reason.");
      }
      
      setImportResults(data);
      toast({
        title: "הייבוא הושלם בהצלחה!",
        description: `נוצרו ${data.created} לקוחות ועודכנו ${data.updated}.`,
        className: "bg-green-100 text-green-900 border-green-200",
      });
      
    } catch (err) {
      console.error("Import failed:", err);
      toast({
        title: "שגיאה בייבוא",
        description: err.message || "An unexpected error occurred during import.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1_UploadFile onFileUploaded={handleFileUploaded} />;
      case 2:
        return (
          <Step2_FieldMapping 
            fileData={fileData} 
            onMappingConfirmed={handleMappingConfirmed} 
            onBack={handleGoBack}
            // Pass the stages, function to create a new one, and loading state as props
            userWorkStages={userWorkStages}
            addUserWorkStage={addUserWorkStage}
            workStagesLoading={stagesLoading}
          />
        );
      case 2.5: // New step for data preview
        return (
          <Step2_5_DataPreview
            fileData={fileData}
            processedMappings={processedMappings}
            userWorkStages={userWorkStages || []} // Pass userWorkStages for dynamic validation/display, ensuring it's always an array
            onBack={handleGoBack}
            onContinue={handlePreviewConfirmed}
          />
        );
      case 3:
        return (
          <Step3_ReviewAndImport 
            fileData={fileData} 
            processedMappings={processedMappings}
            onImport={handleImport}
            isImporting={isImporting}
            importResults={importResults}
            onBack={handleGoBack}
            onFinish={onFinish}
          />
        );
      default:
        return <Step1_UploadFile onFileUploaded={handleFileUploaded} />;
    }
  };

  // Helper function to dynamically get the current step's title,
  // supporting float step IDs (like 2.5).
  const getCurrentStepTitle = () => {
    const step = steps.find(s => s.id === currentStep);
    return step ? step.title : "";
  };

  return (
    <div className="flex flex-col h-full p-2 rtl-text">
        <DialogHeader className="p-4 border-b">
            <div className="flex justify-between items-center">
                 <div>
                    <DialogTitle className="text-xl font-bold">אשף ייבוא לקוחות</DialogTitle>
                    <DialogDescription>
                        שלב {currentStep}: {getCurrentStepTitle()} {/* Use the helper function */}
                    </DialogDescription>
                 </div>
                 <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                 </Button>
            </div>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto p-4">
            {renderStep()}
        </div>
    </div>
  );
}
