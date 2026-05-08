'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import type { UserData } from '@/types/usuario';
import VistaComercial from './VistaComercial';
import VistaJefe from './VistaJefe';

type RolVista = 'comercial' | 'jefe';

function resolverRolVista(): RolVista {
    try {
        const userDataStr = Cookies.get('user_data');
        if (!userDataStr) return 'comercial';
        const userData: UserData = JSON.parse(userDataStr);
        const roles = userData.roles || [];
        const rolesJefe = ['JEFE_COMERCIAL', 'ADMIN', 'GERENCIA', 'SISTEMAS'];
        if (roles.some((r: string) => rolesJefe.includes(r))) return 'jefe';
        return 'comercial';
    } catch {
        return 'comercial';
    }
}

export default function SupervisionLayout() {
    const [rolVista, setRolVista] = useState<RolVista | null>(null);

    useEffect(() => {
        setRolVista(resolverRolVista());
    }, []);

    if (rolVista === null) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-600" />
            </div>
        );
    }

    if (rolVista === 'comercial') {
        return <VistaComercial />;
    }

    return <VistaJefe />;
}
