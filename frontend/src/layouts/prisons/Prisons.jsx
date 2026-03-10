import React, { useState, useEffect } from 'react';
import { Building2, Users, AlertTriangle, MapPin, Shield, Search, RefreshCw } from 'lucide-react';
import PrisonService from '../../services/prison/prisonService';
import toast from 'react-hot-toast';

const PRISON_TYPE_LABELS = {
    CLOSED_PRISON: 'Closed Prison',
    REMAND_PRISON: 'Remand Prison',
    OPEN_PRISON_CAMP: 'Open Prison Camp',
    WORK_CAMP: 'Work Camp',
    TRAINING_SCHOOL: 'Training School',
    CORRECTIONAL_CENTER: 'Correctional Center',
    DRUG_REHAB_CENTER: 'Drug Rehab Center',
    LOCK_UP: 'Lock-Up',
};

const SECURITY_BADGES = {
    MAXIMUM: 'bg-red-100 text-red-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    MINIMUM: 'bg-green-100 text-green-700',
    LOW: 'bg-blue-100 text-blue-700',
};

export default function Prisons() {
    const [prisons, setPrisons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [sortBy, setSortBy] = useState('name');

    const loadPrisons = async () => {
        setLoading(true);
        try {
            const data = await PrisonService.getAllPrisons();
            setPrisons(data);
        } catch (err) {
            toast.error('Failed to load prisons');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPrisons(); }, []);

    const filtered = prisons
        .filter(p => filterType === 'ALL' || p.type === filterType)
        .filter(p =>
            p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'occupancy') return (b.currentPopulation / b.capacity) - (a.currentPopulation / a.capacity);
            if (sortBy === 'capacity') return b.capacity - a.capacity;
            return 0;
        });

    const totalCapacity = prisons.reduce((s, p) => s + (p.capacity || 0), 0);
    const totalPopulation = prisons.reduce((s, p) => s + (p.currentPopulation || 0), 0);
    const overallOccupancy = totalCapacity ? Math.round((totalPopulation / totalCapacity) * 100) : 0;
    const overcrowded = prisons.filter(p => p.capacity && (p.currentPopulation / p.capacity) > 1).length;

    const getOccupancyColor = (pop, cap) => {
        if (!cap) return 'bg-gray-200';
        const pct = (pop / cap) * 100;
        if (pct > 150) return 'bg-red-500';
        if (pct > 100) return 'bg-orange-500';
        if (pct > 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="p-4 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="text-indigo-600" /> Prison Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Sri Lankan Correctional Facilities ({prisons.length} institutions)</p>
                </div>
                <button onClick={loadPrisons} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Total Capacity</div>
                    <div className="text-2xl font-bold text-gray-900">{totalCapacity.toLocaleString()}</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-sm text-gray-500">Current Population</div>
                    <div className="text-2xl font-bold text-gray-900">{totalPopulation.toLocaleString()}</div>
                </div>
                <div className={`rounded-xl border p-4 ${overallOccupancy > 100 ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                    <div className="text-sm text-gray-500">Overall Occupancy</div>
                    <div className={`text-2xl font-bold ${overallOccupancy > 100 ? 'text-red-600' : 'text-gray-900'}`}>{overallOccupancy}%</div>
                </div>
                <div className="bg-white rounded-xl border p-4">
                    <div className="text-sm text-gray-500 flex items-center gap-1"><AlertTriangle size={12} /> Overcrowded</div>
                    <div className="text-2xl font-bold text-orange-600">{overcrowded}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, district, or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="ALL">All Types</option>
                    {Object.entries(PRISON_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="name">Sort by Name</option>
                    <option value="occupancy">Sort by Occupancy</option>
                    <option value="capacity">Sort by Capacity</option>
                </select>
            </div>

            {/* Prison Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-400">Loading prisons...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((prison) => {
                        const occupancy = prison.capacity ? Math.round((prison.currentPopulation / prison.capacity) * 100) : 0;
                        return (
                            <div key={prison.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-900 text-sm">{prison.name}</h3>
                                        <p className="text-xs text-gray-500">{prison.code}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SECURITY_BADGES[prison.securityLevel] || 'bg-gray-100 text-gray-600'}`}>
                                        {prison.securityLevel}
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Shield size={12} /> {PRISON_TYPE_LABELS[prison.type] || prison.type}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <MapPin size={12} /> {prison.district}, {prison.province}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                        <Users size={12} /> {prison.currentPopulation || 0} / {prison.capacity}
                                    </div>
                                </div>

                                {/* Occupancy Bar */}
                                <div className="mt-3">
                                    <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                                        <span>Occupancy</span>
                                        <span className={occupancy > 100 ? 'text-red-600 font-semibold' : ''}>{occupancy}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${getOccupancyColor(prison.currentPopulation, prison.capacity)}`}
                                            style={{ width: `${Math.min(occupancy, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Programs */}
                                {prison.availablePrograms && Array.isArray(prison.availablePrograms) && prison.availablePrograms.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1">
                                        {prison.availablePrograms.slice(0, 3).map((prog, i) => (
                                            <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                                                {prog}
                                            </span>
                                        ))}
                                        {prison.availablePrograms.length > 3 && (
                                            <span className="text-[9px] text-gray-400">+{prison.availablePrograms.length - 3} more</span>
                                        )}
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="mt-3 flex gap-2">
                                    {prison.acceptsConvicted && (
                                        <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Convicted</span>
                                    )}
                                    {prison.acceptsUnconvicted && (
                                        <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Unconvicted</span>
                                    )}
                                    {!prison.active && (
                                        <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Inactive</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
