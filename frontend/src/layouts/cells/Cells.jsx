import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X, Users, Shield, Lock, User } from 'lucide-react';
import CellService from '../../services/cells/cellService';
import InmateService from '../../services/inmate/inmateService';
import toast from 'react-hot-toast';

export default function Cells() {
    const [cells, setCells] = useState([]);
    const [inmates, setInmates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCell, setCurrentCell] = useState(null);
    const [formData, setFormData] = useState({
        block: '',
        cellNumber: '',
        capacity: 4,
        securityLevel: 'MEDIUM',
        gender: 'MALE'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [cellsData, inmatesData] = await Promise.all([
                CellService.getAllCells(),
                InmateService.getAllInmates()
            ]);
            setCells(cellsData);
            setInmates(inmatesData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load prison data");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (currentCell) {
                await CellService.updateCell(currentCell.id, formData);
                toast.success("Cell updated successfully");
            } else {
                await CellService.createCell(formData);
                toast.success("Cell created successfully");
            }
            setIsModalOpen(false);
            fetchData();
            resetForm();
        } catch (error) {
            console.error("Error saving cell:", error);
            toast.error("Failed to save cell");
        }
    };

    const handleEdit = (cell) => {
        setCurrentCell(cell);
        setFormData({
            block: cell.block,
            cellNumber: cell.cellNumber,
            capacity: cell.capacity,
            securityLevel: cell.securityLevel,
            gender: cell.gender
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this cell?")) {
            try {
                await CellService.deleteCell(id);
                toast.success("Cell deleted successfully");
                fetchData();
            } catch (error) {
                console.error("Error deleting cell:", error);
                toast.error("Failed to delete cell");
            }
        }
    };

    const resetForm = () => {
        setCurrentCell(null);
        setFormData({
            block: '',
            cellNumber: '',
            capacity: 4,
            securityLevel: 'MEDIUM',
            gender: 'MALE'
        });
    };

    // Group cells by block
    const cellsByBlock = cells.reduce((acc, cell) => {
        if (!acc[cell.block]) {
            acc[cell.block] = [];
        }
        acc[cell.block].push(cell);
        return acc;
    }, {});

    // Get inmates for a specific cell
    const getInmatesForCell = (cellId) => {
        // Assuming inmate object has cellId or similar linking field. 
        // Based on previous context, InmateResponseDTO has 'cellId' or 'block'/'cellNumber'.
        // Let's try matching by cellId first if available, or block/cellNumber.
        // The InmateResponseDTO showed 'block' and 'cellNumber'. It also had 'cellId' in request but response might vary.
        // Let's assume we can match by block and cellNumber for now as that's reliable from the DTO we saw.
        // Actually, the InmateResponseDTO had 'block' and 'cellNumber'.
        return inmates.filter(inmate => 
            inmate.block === cells.find(c => c.id === cellId)?.block && 
            inmate.cellNumber === cells.find(c => c.id === cellId)?.cellNumber
        );
    };

    const getSecurityColor = (level) => {
        switch (level) {
            case 'MAXIMUM': return 'bg-red-100 text-red-800 border-red-200';
            case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'MINIMUM': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Prison Facility Overview</h1>
                    <p className="text-gray-500 mt-1">Manage blocks, cells, and inmate allocation</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Add New Cell
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(cellsByBlock).sort().map(([block, blockCells]) => (
                        <div key={block} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-200 p-2 rounded-lg">
                                        <Lock className="w-5 h-5 text-slate-700" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800">{block}</h2>
                                    <span className="bg-slate-200 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                        {blockCells.length} Cells
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    Total Capacity: {blockCells.reduce((sum, cell) => sum + cell.capacity, 0)}
                                </div>
                            </div>
                            
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {blockCells.map(cell => {
                                    const cellInmates = getInmatesForCell(cell.id);
                                    const occupancyPercentage = (cellInmates.length / cell.capacity) * 100;
                                    const isOvercrowded = cellInmates.length > cell.capacity;

                                    return (
                                        <div key={cell.id} className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow bg-white flex flex-col">
                                            <div className="p-4 border-b border-gray-100 flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-lg text-gray-900">{cell.cellNumber}</h3>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${getSecurityColor(cell.securityLevel)}`}>
                                                            {cell.securityLevel}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <span className={cell.gender === 'MALE' ? 'text-blue-600' : 'text-pink-600'}>
                                                            {cell.gender}
                                                        </span>
                                                        <span>•</span>
                                                        <span>Cap: {cell.capacity}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEdit(cell)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(cell.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-4 flex-1 flex flex-col">
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-gray-600 font-medium">Occupancy</span>
                                                        <span className={`font-bold ${isOvercrowded ? 'text-red-600' : 'text-gray-700'}`}>
                                                            {cellInmates.length} / {cell.capacity}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                isOvercrowded ? 'bg-red-500' : 
                                                                occupancyPercentage > 80 ? 'bg-orange-500' : 'bg-green-500'
                                                            }`}
                                                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Inmates</h4>
                                                    {cellInmates.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {cellInmates.map(inmate => (
                                                                <div key={inmate.id} className="flex items-center gap-2 p-2 rounded-md bg-gray-50 border border-gray-100">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                                        {inmate.firstName[0]}{inmate.lastName[0]}
                                                                    </div>
                                                                    <div className="overflow-hidden">
                                                                        <p className="text-xs font-medium text-gray-900 truncate">
                                                                            {inmate.firstName} {inmate.lastName}
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-500 truncate">
                                                                            #{inmate.bookingNumber}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-4 border-2 border-dashed border-gray-100 rounded-lg">
                                                            <User className="w-8 h-8 mb-1 opacity-20" />
                                                            <span className="text-xs">Empty Cell</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900">
                                {currentCell ? 'Edit Cell Configuration' : 'Add New Cell'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Block Name</label>
                                <input 
                                    type="text" 
                                    name="block" 
                                    value={formData.block} 
                                    onChange={handleInputChange} 
                                    placeholder="e.g. Block A"
                                    required 
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500" 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cell Number</label>
                                    <input 
                                        type="text" 
                                        name="cellNumber" 
                                        value={formData.cellNumber} 
                                        onChange={handleInputChange} 
                                        placeholder="e.g. A-101"
                                        required 
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                                    <input 
                                        type="number" 
                                        name="capacity" 
                                        value={formData.capacity} 
                                        onChange={handleInputChange} 
                                        min="1"
                                        required 
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500" 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Level</label>
                                    <select 
                                        name="securityLevel" 
                                        value={formData.securityLevel} 
                                        onChange={handleInputChange} 
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                                    >
                                        <option value="MINIMUM">Minimum</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="MAXIMUM">Maximum</option>
                                        <option value="SUPER_MAX">Super Max</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <select 
                                        name="gender" 
                                        value={formData.gender} 
                                        onChange={handleInputChange} 
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                                    >
                                        <option value="MALE">Male</option>
                                        <option value="FEMALE">Female</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 font-medium transition-colors shadow-sm"
                                >
                                    <Save className="w-4 h-4" /> {currentCell ? 'Update Cell' : 'Create Cell'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
