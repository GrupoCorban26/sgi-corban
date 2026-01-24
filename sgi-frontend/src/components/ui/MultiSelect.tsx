import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronsUpDown, X, Search } from 'lucide-react';

interface Option {
    value: string;
    label: string;
    count?: number;
}

interface MultiSelectProps {
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export function MultiSelect({
    options,
    selectedValues,
    onChange,
    placeholder = "Seleccionar...",
    searchPlaceholder = "Buscar...",
    emptyMessage = "No se encontraron resultados.",
    label,
    disabled = false,
    className = ""
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filtrar opciones
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    const toggleOption = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const removeValue = (e: React.MouseEvent, value: string) => {
        e.stopPropagation();
        onChange(selectedValues.filter(v => v !== value));
    };

    const clearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    return (
        <div className={`space-y-1.5 ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {label}
                </label>
            )}

            <div className="relative">
                <div
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`min-h-[42px] w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors bg-white cursor-pointer
                        ${isOpen ? 'ring-2 ring-indigo-500/50 border-indigo-400' : 'border-gray-200 hover:border-gray-300'}
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
                    `}
                >
                    <div className="flex flex-wrap gap-1 items-center flex-1">
                        {selectedValues.length === 0 ? (
                            <span className="text-sm text-gray-400">{placeholder}</span>
                        ) : (
                            selectedValues.length > 2 ? (
                                <div className="flex gap-1">
                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-xs font-medium">
                                        {selectedValues.length} seleccionados
                                    </span>
                                </div>
                            ) : (
                                selectedValues.map(val => {
                                    const opt = options.find(o => o.value === val);
                                    return (
                                        <span key={val} className="bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium">
                                            {opt ? opt.label : val}
                                            <div
                                                onClick={(e) => removeValue(e, val)}
                                                className="hover:bg-indigo-100 rounded-full p-0.5 cursor-pointer"
                                            >
                                                <X size={10} />
                                            </div>
                                        </span>
                                    );
                                })
                            )
                        )}
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                        {selectedValues.length > 0 && !disabled && (
                            <div
                                onClick={clearAll}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                title="Limpiar todo"
                            >
                                <X size={14} />
                            </div>
                        )}
                        <ChevronsUpDown size={16} className="text-gray-400 shrink-0" />
                    </div>
                </div>

                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden">
                        {/* Buscador */}
                        <div className="px-2 pb-2 pt-1 border-b border-gray-50 mb-1">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 placeholder:text-gray-400"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Lista */}
                        <div className="max-h-60 overflow-auto">
                            {filteredOptions.length === 0 ? (
                                <div className="px-4 py-3 text-center text-sm text-gray-400">
                                    {emptyMessage}
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = selectedValues.includes(option.value);
                                    return (
                                        <div
                                            key={option.value}
                                            onClick={() => toggleOption(option.value)}
                                            className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between group
                                                ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors
                                                    ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}
                                                `}>
                                                    {isSelected && <Check size={10} className="text-white" />}
                                                </div>
                                                <span className="font-medium">{option.label}</span>
                                                {option.count !== undefined && (
                                                    <span className="text-xs text-gray-400">({option.count})</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
