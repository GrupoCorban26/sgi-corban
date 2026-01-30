'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export interface Option {
    id: number | string;
    label: string;
    subLabel?: string;
    disabled?: boolean;
}

interface SearchableSelectProps {
    value: number | string | null;
    onChange: (value: number | string | null) => void;
    onSearch?: (query: string) => void;
    options: Option[];
    placeholder?: string;
    loading?: boolean;
    className?: string;
    searchPlaceholder?: string;
    disabled?: boolean;
    label?: string;
    required?: boolean;
    error?: string;
}

export function SearchableSelect({
    value,
    onChange,
    onSearch,
    options = [],
    placeholder = 'Seleccionar...',
    searchPlaceholder = 'Buscar...',
    loading = false,
    className,
    disabled = false,
    label,
    required = false,
    error
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounce search
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (onSearch) {
                onSearch(searchTerm);
            }
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, onSearch]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSelect = (option: Option) => {
        if (option.disabled) return;
        onChange(option.id);
        setIsOpen(false);
        setSearchTerm('');
    };

    const selectedOption = options.find(opt => opt.id === value) || (
        // Try to handle case where options might have changed but we still want to show something?
        // Actually, if selected option is not in list we might want to just show placeholder or value for now.
        // For dynamic lists, usually the selected item should be present in the initial options.
        null
    );

    // If options are static (no onSearch), filter them client-side
    const filteredOptions = onSearch
        ? options
        : options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
        );

    return (
        <div className={clsx("relative", className)} ref={dropdownRef}>
            {label && (
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={clsx(
                    "w-full flex items-center justify-between px-3 py-2 border rounded-xl text-left text-sm transition-colors",
                    "focus:ring-2 focus:ring-indigo-500 outline-none",
                    disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white border-gray-200 hover:border-indigo-300 text-gray-900",
                    isOpen ? "ring-2 ring-indigo-500 border-transparent" : "border-gray-200"
                )}
            >
                <div className="flex flex-col truncate pr-2">
                    {selectedOption ? (
                        <>
                            <span className="truncate">{selectedOption.label}</span>
                            {selectedOption.subLabel && (
                                <span className="text-xs text-gray-500 truncate">{selectedOption.subLabel}</span>
                            )}
                        </>
                    ) : (
                        <span className="text-gray-400">{placeholder}</span>
                    )}
                </div>
                <div className="shrink-0 text-gray-400">
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100">
                        <div className="relative">
                            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder={searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 p-1">
                        {loading ? (
                            <div className="py-4 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Cargando...
                            </div>
                        ) : filteredOptions.length === 0 ? (
                            <div className="py-4 text-center text-gray-400 text-sm">
                                No se encontraron resultados
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    disabled={option.disabled}
                                    className={clsx(
                                        "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
                                        "hover:bg-indigo-50",
                                        value === option.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700",
                                        option.disabled && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="flex flex-col truncate">
                                        <span className="truncate">{option.label}</span>
                                        {option.subLabel && (
                                            <span className="text-xs text-gray-500 truncate">{option.subLabel}</span>
                                        )}
                                    </div>
                                    {value === option.id && <Check size={14} className="text-indigo-600 shrink-0 ml-2" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1.5">
                    <AlertCircle size={12} />
                    {error}
                </p>
            )}
        </div>
    );
}
