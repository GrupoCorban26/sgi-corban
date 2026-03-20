'use client';

import React from 'react';
import { SectionBaseDatos } from './components/SectionBaseDatos';
import { SectionCartera } from './components/SectionCartera';
import { SectionBuzon } from './components/SectionBuzon';
import { SectionLlamadas } from './components/SectionLlamadas';

export default function ReportesPage() {
    return (
        <div className="space-y-6">
            {/* Header Global (opcional) */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        Reportes de Sistemas y Rendimiento
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Desglose de métricas por sección. Utilice los filtros locales de cada tabla.
                    </p>
                </div>
            </div>

            {/* Renderizar cada sección de forma independiente */}
            <SectionBaseDatos />
            <SectionCartera />
            <SectionBuzon />
            <SectionLlamadas />
        </div>
    );
}
