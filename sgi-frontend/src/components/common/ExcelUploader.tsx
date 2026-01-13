import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ExcelUploaderProps {
    onUpload: (file: File) => Promise<void>;
    label: string;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onUpload, label }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus('idle');
        setErrorMessage('');

        try {
            await onUpload(file);
            setUploadStatus('success');
        } catch (error: any) {
            setUploadStatus('error');
            setErrorMessage(error.message || 'Error al subir el archivo');
            console.error(error);
        } finally {
            setIsUploading(false);
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors bg-gray-50">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
            />

            <div className="flex flex-col items-center gap-2">
                {isUploading ? (
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                ) : uploadStatus === 'success' ? (
                    <CheckCircle className="w-10 h-10 text-green-500" />
                ) : uploadStatus === 'error' ? (
                    <AlertCircle className="w-10 h-10 text-red-500" />
                ) : (
                    <FileSpreadsheet className="w-10 h-10 text-gray-400" />
                )}

                <h3 className="text-lg font-medium text-gray-700">{label}</h3>

                {uploadStatus === 'error' && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                )}

                {uploadStatus === 'success' && (
                    <p className="text-sm text-green-600">Archivo procesado correctamente</p>
                )}

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isUploading ? 'Procesando...' : 'Seleccionar archivo Excel'}
                </button>

                <p className="text-xs text-gray-500 mt-1">Soporta formatos .xlsx y .xls</p>
            </div>
        </div>
    );
};
