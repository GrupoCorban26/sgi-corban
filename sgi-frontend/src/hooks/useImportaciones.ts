import { useState, useEffect, useCallback } from 'react';
import { importacionesService } from '../services/importaciones';
import { Importacion } from '../types/importaciones';
import { useDebounce } from './useDebounce';

export const useImportaciones = () => {
    const [data, setData] = useState<Importacion[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');

    // Debounce de 500ms para la búsqueda
    const debouncedSearch = useDebounce(search, 500);

    const fetchImportaciones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await importacionesService.getImportaciones(page, pageSize, debouncedSearch);
            setData(res.data);
            setTotal(res.total);
        } catch (err: any) {
            const message = err.response?.data?.detail || err.message || 'Error al cargar datos';
            setError(message);
            console.error('Error fetching importaciones:', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch]);

    useEffect(() => {
        fetchImportaciones();
    }, [fetchImportaciones]);

    const uploadFile = async (file: File) => {
        setLoading(true);
        setError(null);
        try {
            const result = await importacionesService.uploadImportaciones(file);
            // Refresh data after upload
            await fetchImportaciones();
            return result;
        } catch (err: any) {
            const message = err.response?.data?.detail || err.message || 'Error al subir archivo';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    };

    return {
        data,
        total,
        loading,
        error,
        page,
        setPage,
        search,
        setSearch,
        pageSize,
        uploadFile,
        refresh: fetchImportaciones
    };
};
