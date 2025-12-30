"use client";
import { useEffect, useState } from 'react';
import { areaService } from '@/services/areas';
import { Area } from '@/types/areas';

export default function AreasPage() {
    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);

    const loadAreas = async () => {
        try {
            const response = await areaService.getAreas(1, 10);
            setAreas(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadAreas(); }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Gestión de Áreas - Grupo Corban</h1>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <table className="min-w-full leading-normal">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 text-left text-sm uppercase font-semibold">
                            <th className="px-5 py-3 border-b">Nombre</th>
                            <th className="px-5 py-3 border-b">Descripción</th>
                            <th className="px-5 py-3 border-b">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {areas.map((area) => (
                            <tr key={area.id} className="hover:bg-gray-50">
                                <td className="px-5 py-5 border-b text-sm">{area.nombre}</td>
                                <td className="px-5 py-5 border-b text-sm">{area.descripcion}</td>
                                <td className="px-5 py-5 border-b text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs ${area.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {area.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}