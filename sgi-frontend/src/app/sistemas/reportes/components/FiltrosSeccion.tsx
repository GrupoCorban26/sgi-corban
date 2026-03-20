import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { useComerciales } from '@/hooks/organizacion/useComerciales';

interface FiltrosSeccionProps {
    fechaInicio: string;
    fechaFin: string;
    setFechaInicio: (val: string) => void;
    setFechaFin: (val: string) => void;
    comercialId: string | undefined;
    setComercialId: (val: string | undefined) => void;
    empresa: string | undefined;
    setEmpresa: (val: string | undefined) => void;
    onExport: () => void;
    isExporting?: boolean;
    hasData?: boolean;
}

export function FiltrosSeccion({
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
    comercialId,
    setComercialId,
    empresa,
    setEmpresa,
    onExport,
    isExporting = false,
    hasData = false
}: FiltrosSeccionProps) {
    const { data: comerciales = [] } = useComerciales();
    
    // Check roles
    const [roles, setRoles] = useState<string[]>([]);
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
                try {
                    const user = JSON.parse(userDataStr);
                    setRoles(user.roles || []);
                } catch (e) {}
            }
        }
    }, []);

    const isSistemasOrAdmin = roles.includes('SISTEMAS') || roles.includes('ADMIN') || roles.includes('GERENCIA') || roles.includes('ADMINISTRADOR');
    const isJefeComercial = roles.includes('JEFE_COMERCIAL');

    return (
        <div className="flex flex-wrap items-center gap-3 w-full border-b pb-4 mb-4">
            <div className="flex flex-wrap items-center gap-2">
                {/* Fechas */}
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
                    <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                        className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                    />
                    <span className="text-gray-400 font-bold">-</span>
                    <input
                        type="date"
                        value={fechaFin}
                        onChange={(e) => setFechaFin(e.target.value)}
                        className="bg-transparent text-sm text-gray-700 font-medium focus:outline-none p-1 cursor-pointer"
                    />
                </div>

                {/* Comercial */}
                {(isSistemasOrAdmin || isJefeComercial) && (
                    <select
                        value={comercialId || ''}
                        onChange={(e) => setComercialId(e.target.value || undefined)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Todos los comerciales</option>
                        {comerciales.map(c => (
                            <option key={c.id} value={c.id.toString()}>
                                {c.nombre}
                            </option>
                        ))}
                    </select>
                )}

                {/* Empresa */}
                {isSistemasOrAdmin && (
                    <select
                        value={empresa || ''}
                        onChange={(e) => setEmpresa(e.target.value || undefined)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                    >
                        <option value="">Todas las empresas</option>
                        <option value="EBL">EBL</option>
                        <option value="CORBAN">CORBAN</option>
                        <option value="TRANS CARGO">TRANS CARGO</option>
                        <option value="TRANS LOGISTIC">TRANS LOGISTIC</option>
                    </select>
                )}
            </div>

            <div className="flex-1"></div>

            <button
                onClick={onExport}
                disabled={isExporting || !hasData}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm"
            >
                <Download size={16} />
                Exportar Excel
            </button>
        </div>
    );
}
