
import Cookies from 'js-cookie';
import { useState, useEffect } from 'react';

export interface CurrentUser {
    id: number;
    nombre: string;
    roles: string[];
    area?: string;
}

export const useCurrentUser = () => {
    const [user, setUser] = useState<CurrentUser | null>(null);

    useEffect(() => {
        try {
            const userData = Cookies.get('user_data');
            if (userData) {
                const parsed = JSON.parse(userData);
                // Ensure roles is always an array
                if (!Array.isArray(parsed.roles) && parsed.roles) {
                    parsed.roles = [parsed.roles];
                }
                setUser(parsed);
            }
        } catch (e) {
            console.error("Error parsing user_data cookie", e);
        }
    }, []);

    const hasRole = (roleToCheck: string) => {
        if (!user || !user.roles) return false;
        return user.roles.includes(roleToCheck);
    };

    const isJefeComercial = () => hasRole('JEFE_COMERCIAL');
    const isAdmin = () => hasRole('ADMIN');

    return {
        user,
        hasRole,
        isJefeComercial,
        isAdmin
    };
};
