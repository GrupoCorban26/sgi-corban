/**
 * Contactos Page (Sistemas)
 * - Upload Excel de Contactos (RUC, Telefono, Email)
 * - Vista de carga masiva para administradores
 */
'use client';

import { useState } from 'react';
import { ExcelUploader } from '@/components/common/ExcelUploader';
import { useContactos } from '@/hooks/useContactos';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export default function ContactosPage() {
    const { upload } = useContactos();
    const [lastUploadStatus, setLastUploadStatus] = useState<string>('');

    const handleUpload = async (file: File) => {
        try {
            const res = await upload(file);
            setLastUploadStatus(res.message || 'Carga exitosa');
        } catch (error: any) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Contactos</h1>
                <p className="text-gray-500">Sube un archivo Excel para agregar nuevos contactos a la base de datos.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                        <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-medium mb-2">Subir Archivo de Contactos</h2>
                        <p className="text-sm text-gray-500 mb-4">Los contactos nuevos serán agregados. Los existentes (mismo RUC + Teléfono) serán ignorados.</p>
                        <div className="w-full max-w-xl">
                            <ExcelUploader onUpload={handleUpload} label="Seleccionar Excel de Contactos" />
                        </div>
                    </div>
                </div>

                {lastUploadStatus && (
                    <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        {lastUploadStatus}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Formato Requerido del Excel</h3>
                    <div className="mt-3 overflow-x-auto">
                        <table className="text-sm border rounded">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Columna</th>
                                    <th className="px-4 py-2 text-left font-medium">Requerido</th>
                                    <th className="px-4 py-2 text-left font-medium">Descripción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr><td className="px-4 py-2 font-mono">ruc</td><td className="px-4 py-2 text-green-600">✓ Sí</td><td className="px-4 py-2">RUC de la empresa</td></tr>
                                <tr><td className="px-4 py-2 font-mono">telefono</td><td className="px-4 py-2 text-green-600">✓ Sí</td><td className="px-4 py-2">Número de contacto</td></tr>
                                <tr><td className="px-4 py-2 font-mono">email</td><td className="px-4 py-2 text-gray-400">Opcional</td><td className="px-4 py-2">Correo electrónico</td></tr>
                                <tr><td className="px-4 py-2 font-mono">cargo</td><td className="px-4 py-2 text-gray-400">Opcional</td><td className="px-4 py-2">Cargo del contacto</td></tr>
                                <tr><td className="px-4 py-2 font-mono">is_client</td><td className="px-4 py-2 text-gray-400">Opcional</td><td className="px-4 py-2">1 = Cliente, 0 = Prospecto (default: 0)</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}