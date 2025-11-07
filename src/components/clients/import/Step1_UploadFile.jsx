import React, { useState, useRef } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadFile } from '@/integrations/Core';
import { parseImportFile } from '@/functions/parseImportFile';
import { useToast } from "@/components/ui/use-toast";

const supportedMimeTypes = {
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};
const supportedMimeTypesString = Object.keys(supportedMimeTypes).join(',');

export default function Step1_UploadFile({ onFileUploaded }) {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { toast } = useToast();
    const [isDragActive, setIsDragActive] = useState(false);
    const inputRef = useRef(null);

    const handleFiles = (files) => {
        setError('');
        if (files && files.length > 0) {
            const selectedFile = files[0];
            
            // Check file extension as a fallback for MIME types
            const fileExtension = '.' + selectedFile.name.split('.').pop().toLowerCase();
            const acceptedExtensions = Object.values(supportedMimeTypes).flat();

            if (Object.keys(supportedMimeTypes).includes(selectedFile.type) || acceptedExtensions.includes(fileExtension)) {
                setFile(selectedFile);
            } else {
                setError('קובץ לא נתמך. יש להעלות קבצי CSV, XLS או XLSX בלבד.');
                setFile(null);
            }
        }
    };
    
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const onZoneClick = () => {
        inputRef.current.click();
    };

    const handleProceed = async () => {
        if (!file) return;

        setIsLoading(true);
        setError('');

        try {
            const { file_url } = await UploadFile({ file });
            if (!file_url) {
                throw new Error("שגיאה בהעלאת הקובץ.");
            }
            
            const { data: parseResult, error: parseError } = await parseImportFile({
                file_url: file_url,
                fileName: file.name
            });
            
            if (parseError || !parseResult.success) {
                throw new Error(parseError?.message || parseResult.error || "שגיאה בפענוח הקובץ.");
            }

            onFileUploaded({
                name: file.name,
                rows: parseResult.rows,
                headers: parseResult.headers,
                totalRows: parseResult.totalRows,
                file_url: file_url
            });

        } catch (err) {
            console.error(err);
            const errorMessage = err.message || 'אירעה שגיאה בלתי צפויה. נסה שוב.';
            setError(errorMessage);
            toast({
                title: "שגיאה",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 rtl-text">
            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={onZoneClick}
                className={`w-full max-w-lg border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`
                }
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={supportedMimeTypesString}
                    onChange={handleChange}
                    multiple={false}
                />
                <div className="flex flex-col items-center pointer-events-none">
                    <Upload className="h-12 w-12 text-slate-400 mb-4" />
                    {isDragActive ? (
                        <p className="text-slate-600">שחרר את הקובץ כאן...</p>
                    ) : (
                        <p className="text-slate-600">גרור ושחרר קובץ לכאן, או לחץ לבחירה</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">קבצי CSV, XLS, XLSX נתמכים</p>
                </div>
            </div>

            {file && (
                <div className="mt-6 w-full max-w-lg bg-slate-50 p-4 rounded-lg flex items-center justify-between border">
                    <div className="flex items-center gap-3">
                        <File className="h-6 w-6 text-slate-500" />
                        <span className="font-medium text-slate-800">{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {error && (
                <p className="mt-4 text-red-500">{error}</p>
            )}

            <Button
                onClick={handleProceed}
                disabled={!file || isLoading}
                className="mt-8"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        מעבד...
                    </>
                ) : (
                    'המשך לשלב הבא'
                )}
            </Button>
        </div>
    );
}