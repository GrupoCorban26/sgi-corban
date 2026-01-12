'use client';

import React from 'react';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

export function TabButton({ active, onClick, icon, label }: TabButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`cursor-pointer flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${active
                    ? 'bg-gray-100 text-blue-600 shadow-inner'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
