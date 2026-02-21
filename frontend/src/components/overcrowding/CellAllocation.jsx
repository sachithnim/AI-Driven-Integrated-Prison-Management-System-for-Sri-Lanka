import React, { useState, useEffect } from 'react';
import { LayoutGrid, UserPlus, ArrowRight, User, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import CellService from '../../services/cells/cellService';
import InmateService from '../../services/inmate/inmateService';
import toast from 'react-hot-toast';

const CellAllocation = () => {
    const [cells, setCells] = useState([]);
    const [inmates, setInmates] = useState([]);
    const [unallocatedInmates, setUnallocatedInmates] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cellsData, inmatesData] = await Promise.all([
                    CellService.getAllCells(),
                    InmateService.getAllInmates()
                ]);

                // Calculate current count for each cell
                const cellsWithCount = cellsData.map(cell => {
                    const count = inmatesData.filter(inmate => 
                        inmate.block === cell.block && 
                        inmate.cellNumber === cell.cellNumber
                    ).length;
                    return { ...cell, currentCount: count };
                });

                setCells(cellsWithCount);
                setInmates(inmatesData);

                // Filter unallocated inmates (those without block or cellNumber)
                const unallocated = inmatesData.filter(inmate => 
                    !inmate.block || !inmate.cellNumber
                );
                setUnallocatedInmates(unallocated);

                // Select first unallocated inmate by default if available
                if (unallocated.length > 0) {
                    setSelectedInmate(unallocated[0]);
                }

            } catch (err) {
                console.error("Error fetching data:", err);
                toast.error("Failed to load allocation data");
            } finally {
                setLoadingData(false);
            }
        };
        fetchData();
    }, []);

    const [selectedInmate, setSelectedInmate] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const getSuggestions = async () => {
        if (!selectedInmate) {
            toast.error("Please select an inmate first");
            return;
        }

        setLoading(true);
        try {
            // Prepare payload for AI service
            const formattedCells = cells.map(c => ({
                id: String(c.id), // Ensure ID is string
                block: c.block,
                cell_number: c.cellNumber,
                capacity: c.capacity,
                current_count: c.currentCount || 0
            }));

            const inmatePayload = {
                id: String(selectedInmate.id),
                security_level: selectedInmate.securityLevel || 'Medium', // Default if missing
                gender: selectedInmate.gender || 'Male'
            };

            const response = await axios.post('http://localhost:8002/api/v1/overcrowding/suggest-allocation', {
                inmate: inmatePayload,
                cells: formattedCells
            });
            setSuggestions(response.data.suggestions);
        } catch (err) {
            console.error("Error getting suggestions:", err);
            toast.error("AI Service unavailable. Showing basic suggestions.");
            
            // Fallback logic
            const sorted = [...cells]
                .filter(c => c.currentCount < c.capacity)
                .sort((a, b) => (a.currentCount / a.capacity) - (b.currentCount / b.capacity));
            setSuggestions(sorted.slice(0, 3));
        } finally {
            setLoading(false);
        }
    };

    const handleAllocate = async (cell) => {
        if (!selectedInmate) return;

        try {
            // Update inmate with new cell assignment
            const updatedInmate = {
                ...selectedInmate,
                block: cell.block,
                cellNumber: cell.cellNumber || cell.cell_number
            };

            await InmateService.updateInmate(selectedInmate.id, updatedInmate);
            toast.success(`Allocated ${selectedInmate.firstName} to ${cell.block}-${cell.cellNumber || cell.cell_number}`);
            
            // Refresh data
            const [cellsData, inmatesData] = await Promise.all([
                CellService.getAllCells(),
                InmateService.getAllInmates()
            ]);

             // Recalculate counts
             const cellsWithCount = cellsData.map(c => {
                const count = inmatesData.filter(i => 
                    i.block === c.block && 
                    i.cellNumber === c.cellNumber
                ).length;
                return { ...c, currentCount: count };
            });

            setCells(cellsWithCount);
            setInmates(inmatesData);
            
            const unallocated = inmatesData.filter(inmate => !inmate.block || !inmate.cellNumber);
            setUnallocatedInmates(unallocated);
            setSelectedInmate(unallocated.length > 0 ? unallocated[0] : null);
            setSuggestions([]);

        } catch (error) {
            console.error("Allocation failed:", error);
            toast.error("Failed to allocate cell");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-purple-600" />
                Smart Cell Allocation
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: Unallocated Inmates */}
                <div className="lg:col-span-1 border-r border-gray-100 pr-4">
                    <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Pending Allocation
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                            {unallocatedInmates.length}
                        </span>
                    </h3>
                    
                    {loadingData ? (
                        <div className="text-gray-500 text-sm">Loading inmates...</div>
                    ) : unallocatedInmates.length === 0 ? (
                        <div className="text-green-600 text-sm flex items-center gap-2 bg-green-50 p-3 rounded">
                            <CheckCircle className="w-4 h-4" /> All inmates allocated!
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {unallocatedInmates.map((inmate) => (
                                <div 
                                    key={inmate.id}
                                    onClick={() => {
                                        setSelectedInmate(inmate);
                                        setSuggestions([]);
                                    }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedInmate?.id === inmate.id 
                                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-300' 
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-gray-900">{inmate.firstName} {inmate.lastName}</div>
                                            <div className="text-xs text-gray-500">ID: {inmate.inmateId}</div>
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                            inmate.securityLevel === 'MAXIMUM' ? 'bg-red-100 text-red-700' :
                                            inmate.securityLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {inmate.securityLevel}
                                        </span>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 flex gap-2">
                                        <span>{inmate.gender}</span>
                                        <span>•</span>
                                        <span>{inmate.offenseType || 'N/A'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 2 & 3: Allocation Interface */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold mb-2 text-gray-700">Current Cell Status</h3>
                        {loadingData ? (
                            <div className="text-gray-500">Loading cells...</div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {cells.map((cell, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                                        <div>
                                            <span className="font-medium">Block {cell.block} - Cell {cell.cellNumber}</span>
                                            <div className="text-xs text-gray-500">Capacity: {cell.capacity}</div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-sm font-bold ${
                                            cell.currentCount >= cell.capacity ? 'bg-red-100 text-red-700' : 
                                            cell.currentCount >= cell.capacity * 0.8 ? 'bg-yellow-100 text-yellow-700' : 
                                            'bg-green-100 text-green-700'
                                        }`}>
                                            {cell.currentCount} / {cell.capacity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2 text-gray-700">Allocation Action</h3>
                        {selectedInmate ? (
                            <div className="p-4 bg-blue-50 rounded-lg mb-4 border border-blue-100">
                                <div className="text-sm text-blue-800 mb-1">Allocating for:</div>
                                <div className="font-bold text-blue-900 text-lg">
                                    {selectedInmate.firstName} {selectedInmate.lastName}
                                </div>
                                <div className="text-sm text-blue-700 mt-1">
                                    {selectedInmate.gender} • {selectedInmate.securityLevel} Security
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-gray-50 rounded-lg mb-4 border border-gray-200 text-gray-500 text-center">
                                Select an inmate from the list to start allocation
                            </div>
                        )}
                        
                        <button
                            onClick={getSuggestions}
                            disabled={loading || !selectedInmate}
                            className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                            {loading ? 'Analyzing...' : 'Get Suggestions'}
                        </button>

                        {suggestions.length > 0 && (
                            <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h4 className="text-sm font-semibold text-gray-600 mb-2">Recommended Cells:</h4>
                                <div className="space-y-2">
                                    {suggestions.map((cell, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded hover:bg-green-100 transition-colors group">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-green-200 text-green-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium">Block {cell.block} - Cell {cell.cellNumber || cell.cell_number}</div>
                                                    <div className="text-xs text-gray-500">
                                                        Occupancy: {Math.round(((cell.currentCount || cell.current_count) / cell.capacity) * 100)}%
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleAllocate(cell)}
                                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                Assign
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CellAllocation;
