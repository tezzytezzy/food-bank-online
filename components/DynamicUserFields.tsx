import React from "react";
import { Minus, Plus } from "lucide-react";

export type FieldType = 'number' | 'boolean' | 'text' | 'list';

export interface FieldDefinition {
    label: string;
    data_type: FieldType;
}

export interface DynamicUserFieldsProps {
    fields: Record<string, FieldDefinition>;
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
}

export function DynamicUserFields({ fields, values, onChange }: DynamicUserFieldsProps) {
    if (!fields || Object.keys(fields).length === 0) return null;

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">
            {Object.entries(fields).map(([key, def]) => (
                <div key={key} className="flex items-center justify-between p-4">
                    {/* Left Column: Label */}
                    <label className="text-sm font-semibold text-gray-700 w-1/3 break-words pr-2">
                        {def.label}
                    </label>

                    {/* Right Column: Input Component */}
                    <div className="flex-1 flex justify-end">
                        {renderInput(key, def, values[key], onChange)}
                    </div>
                </div>
            ))}
        </div>
    );
}

function renderInput(key: string, def: FieldDefinition, value: any, onChange: (k: string, v: any) => void) {
    switch (def.data_type) {
        case 'number':
            const numVal = typeof value === 'number' ? value : 0;
            return (
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
                    <button
                        type="button"
                        onClick={() => onChange(key, Math.max(0, numVal - 1))}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-md shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 transition"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-bold text-lg text-gray-900">{numVal}</span>
                    <button
                        type="button"
                        onClick={() => onChange(key, numVal + 1)}
                        className="w-10 h-10 flex items-center justify-center bg-blue-600 rounded-md shadow-sm border border-blue-600 text-white hover:bg-blue-700 active:scale-95 transition"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            );

        case 'boolean':
            // Normalize boolean value
            const boolVal = value === true || value === 'true';
            return (
                <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                    <button
                        type="button"
                        onClick={() => onChange(key, true)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition flex-1 ${boolVal ? 'bg-white text-green-700 shadow-sm ring-1 ring-green-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        YES
                    </button>
                    <button
                        type="button"
                        onClick={() => onChange(key, false)}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition flex-1 ${!boolVal ? 'bg-white text-red-700 shadow-sm ring-1 ring-red-200' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        NO
                    </button>
                </div>
            );

        case 'list':
        case 'text':
        default:
            return (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(key, e.target.value)}
                    className="w-full max-w-[220px] p-2.5 text-right bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 placeholder-gray-400 transition"
                    placeholder="Enter details..."
                />
            );
    }
}
