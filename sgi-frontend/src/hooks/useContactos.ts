import { useState, useCallback } from 'react';
import { contactosService } from '../services/contactos';
import { Contacto } from '../types/contactos';

export const useContactos = () => {
    const [contacts, setContacts] = useState<Contacto[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchByRuc = useCallback(async (ruc: string) => {
        setLoading(true);
        try {
            const data = await contactosService.getByRuc(ruc);
            setContacts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    const create = async (contact: Omit<Contacto, 'id'>) => {
        await contactosService.create(contact);
    };

    const update = async (id: number, contact: Partial<Contacto>) => {
        await contactosService.update(id, contact);
    };

    const remove = async (id: number) => {
        await contactosService.delete(id);
    };

    const upload = async (file: File) => {
        return await contactosService.upload(file);
    };

    const assignBatch = async () => {
        setLoading(true);
        try {
            const leads = await contactosService.assignBatch();
            return leads;
        } finally {
            setLoading(false);
        }
    };

    return {
        contacts,
        loading,
        fetchByRuc,
        create,
        update,
        remove,
        upload,
        assignBatch
    };
};
