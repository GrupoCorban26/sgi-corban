import { useState, useEffect, useCallback } from 'react';
import { importacionesService } from '../../services/comercial/importaciones';
import { Importacion } from '../../types/importaciones';
import { useDebounce } from '../useDebounce';

export const useImportaciones = () => {
    const [data, setData] = useState<Importacion[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [sinTelefono, setSinTelefono] = useState(false);
    const [sortByRuc, setSortByRuc] = useState<string | null>(null);
    const [paisOrigen, setPaisOrigen] = useState<string>('');
    const [cantAgentes, setCantAgentes] = useState<string>('');
    const [paisesDropdown, setPaisesDropdown] = useState<string[]>([]);

    // Debounce de 500ms para la búsqueda
    const debouncedSearch = useDebounce(search, 500);

    const fetchImportaciones = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const parsedAgentes = cantAgentes ? parseInt(cantAgentes) : null;
            const res = await importacionesService.getImportaciones(
                page,
                pageSize,
                debouncedSearch,
                sinTelefono,
                sortByRuc || undefined,
                paisOrigen || undefined,
                parsedAgentes
            );
            setData(res.data);
            setTotal(res.total);
        } catch (err: any) {
            const message = err.response?.data?.detail || err.message || 'Error al cargar datos';
            setError(message);
            console.error('Error fetching importaciones:', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearch, sinTelefono, sortByRuc, paisOrigen, cantAgentes]);

    const fetchPaises = useCallback(async () => {
        try {
            const paises = await importacionesService.getPaisesOrigen();
            setPaisesDropdown(paises);
        } catch (err) {
            console.error('Error fetching paises:', err);
        }
    }, []);

    useEffect(() => {
        fetchPaises();
    }, [fetchPaises]);

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
        sinTelefono,
        setSinTelefono,
        sortByRuc,
        setSortByRuc,
        paisOrigen,
        setPaisOrigen,
        cantAgentes,
        setCantAgentes,
        paisesDropdown,
        pageSize,
        uploadFile,
        refresh: fetchImportaciones
    };
};
