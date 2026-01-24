import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
    description?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number | null;
    onChange: (value: string | number | null) => void;
    placeholder?: string;
    emptyMessage?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Seleccionar...",
    emptyMessage = "No se encontraron resultados.",
    label,
    required,
    disabled = false,
    error,
    className = ""
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Opción seleccionada actual
    const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

    // Sincronizar input con selección cuando no está abierto
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm(selectedOption ? selectedOption.label : "");
        }
    }, [selectedOption, isOpen]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Restaurar texto si no se seleccionó nada nuevo
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else {
                    setSearchTerm("");
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [selectedOption]);

    // Filtrar opciones
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (opt.description && opt.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [options, searchTerm]);

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
    };

    const clearSelection = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        setSearchTerm("");
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (!isOpen) setIsOpen(true);

        // Si borra todo el texto, limpiar selección
        if (e.target.value === "") {
            onChange(null);
        }
    };

    const handleInputFocus = () => {
        if (!disabled) {
            setIsOpen(true);
            // Si hay selección, seleccionar todo el texto para facilitar reemplazo
            if (selectedOption) {
                inputRef.current?.select();
            }
        }
    };

    return (
        <div className={`space-y-1.5 ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative group">
                <div className={`relative flex items-center w-full rounded-xl border transition-colors bg-white
                        ${error
                        ? 'border-red-300 focus-within:ring-2 focus-within:ring-red-500/50'
                        : 'border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/50 hover:border-gray-300'}
                        ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
                    `}>

                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleInputChange}
                        onFocus={handleInputFocus}
                        placeholder={placeholder}
                        disabled={disabled}
                        className={`w-full py-2.5 pl-3 pr-8 bg-transparent border-none outline-none text-sm text-gray-900 placeholder:text-gray-400 rounded-xl`}
                    />

                    <div className="absolute right-2 flex items-center gap-1">
                        {value && !disabled && (
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                        <ChevronsUpDown size={16} className="text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 overflow-hidden max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-center text-sm text-gray-400">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => handleSelect(option.value)}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between group
                                        ${value === option.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-900">{option.label}</span>
                                        {option.description && (
                                            <span className={`text-xs ${value === option.value ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                                {option.description}
                                            </span>
                                        )}
                                    </div>
                                    {value === option.value && <Check size={16} className="text-indigo-600" />}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
}

function AlertCircle({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
