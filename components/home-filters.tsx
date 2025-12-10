'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface HomeFiltersProps {
    countries: string[];
    states: string[];
    cities: string[];
}

export default function HomeFilters({ countries, states, cities }: HomeFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentCountry = searchParams.get('country') || '';
    const currentState = searchParams.get('state') || '';
    const currentCity = searchParams.get('city') || '';

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        // Reset sub-filters if parent changes
        if (key === 'country') {
            params.delete('state');
            params.delete('city');
        }
        if (key === 'state') {
            params.delete('city');
        }

        router.replace(`/?${params.toString()}`);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country Filter */}
                <select
                    value={currentCountry}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">All Countries</option>
                    {countries.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>

                {/* State Filter */}
                <select
                    value={currentState}
                    onChange={(e) => handleFilterChange('state', e.target.value)}
                    disabled={!currentCountry && states.length === 0}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">All States</option>
                    {states.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>

                {/* City Filter */}
                <select
                    value={currentCity}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                    disabled={!currentState && cities.length === 0}
                    className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="">All Cities</option>
                    {cities.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
