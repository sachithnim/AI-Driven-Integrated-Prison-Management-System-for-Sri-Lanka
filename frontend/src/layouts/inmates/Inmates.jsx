import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, X, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InmateService from '../../services/inmate/inmateService';
import toast from 'react-hot-toast';

export default function Inmates() {
    const navigate = useNavigate();
    const [inmates, setInmates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        bookingNumber: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'MALE',
        caseType: 'OTHER',
        sentenceStartDate: '',
        sentenceEndDate: '',
        sentenceDurationMonths: 0,
        securityLevel: 'MEDIUM',
        currentFacility: 'Main Prison',
        admissionDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchInmates();
    }, []);

    const fetchInmates = async () => {
        try {
            const data = await InmateService.getAllInmates();
            setInmates(data);
        } catch (error) {
            console.error("Error fetching inmates:", error);
            toast.error("Failed to load inmates");
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
            await InmateService.createInmate(formData);
            toast.success("Inmate registered successfully");
            setIsModalOpen(false);
            fetchInmates();
            resetForm();
        } catch (error) {
            console.error("Error creating inmate:", error);
            toast.error("Failed to register inmate");
        }
    };

    const resetForm = () => {
        setFormData({
            bookingNumber: '',
            firstName: '',
            lastName: '',
            dateOfBirth: '',
            gender: 'MALE',
            caseType: 'OTHER',
            sentenceStartDate: '',
            sentenceEndDate: '',
            sentenceDurationMonths: 0,
            securityLevel: 'MEDIUM',
            currentFacility: 'Main Prison',
            admissionDate: new Date().toISOString().split('T')[0]
        });
    };

    const filteredInmates = inmates.filter(inmate => 
        inmate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inmate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inmate.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inmate Management</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-900 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
                >
                    <Plus className="w-4 h-4" /> Register Inmate
                </button>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search inmates..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 hover:bg-gray-50">
                    <Filter className="w-4 h-4" /> Filter
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">Loading inmates...</div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking #</th> */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Security</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInmates.map((inmate) => (
                                <tr key={inmate.id}>
                                    {/* <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{inmate.bookingNumber}</td> */}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3">
                                                {inmate.firstName[0]}{inmate.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{inmate.firstName} {inmate.lastName}</div>
                                                <div className="text-xs text-gray-500">{inmate.age} yrs • {inmate.gender}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${inmate.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {inmate.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {inmate.block} - {inmate.cellNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${inmate.securityLevel === 'MAXIMUM' ? 'bg-red-100 text-red-800' : 
                                              inmate.securityLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 
                                              'bg-green-100 text-green-800'}`}>
                                            {inmate.securityLevel}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => navigate(`/inmates/${inmate.id}`)} className="text-blue-600 hover:text-blue-900 mr-3"><Eye className="w-4 h-4" /></button>
                                        <button className="text-indigo-600 hover:text-indigo-900 mr-3"><Edit className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">Register New Inmate</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Booking Number</label>
                                <input type="text" name="bookingNumber" value={formData.bookingNumber} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Gender</label>
                                <select name="gender" value={formData.gender} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Case Type</label>
                                <select name="caseType" value={formData.caseType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="MURDER">Murder</option>
                                    <option value="MANSLAUGHTER">Manslaughter</option>
                                    <option value="ASSAULT">Assault</option>
                                    <option value="ROBBERY">Robbery</option>
                                    <option value="BURGLARY">Burglary</option>
                                    <option value="THEFT">Theft</option>
                                    <option value="DRUG_TRAFFICKING">Drug Trafficking</option>
                                    <option value="DRUG_POSSESSION">Drug Possession</option>
                                    <option value="FRAUD">Fraud</option>
                                    <option value="EMBEZZLEMENT">Embezzlement</option>
                                    <option value="RAPE">Rape</option>
                                    <option value="SEXUAL_ASSAULT">Sexual Assault</option>
                                    <option value="KIDNAPPING">Kidnapping</option>
                                    <option value="ARSON">Arson</option>
                                    <option value="TERRORISM">Terrorism</option>
                                    <option value="CYBERCRIME">Cybercrime</option>
                                    <option value="DOMESTIC_VIOLENCE">Domestic Violence</option>
                                    <option value="HUMAN_TRAFFICKING">Human Trafficking</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sentence Start</label>
                                <input type="date" name="sentenceStartDate" value={formData.sentenceStartDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sentence End</label>
                                <input type="date" name="sentenceEndDate" value={formData.sentenceEndDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Duration (Months)</label>
                                <input type="number" name="sentenceDurationMonths" value={formData.sentenceDurationMonths} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                                <input type="date" name="admissionDate" value={formData.admissionDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Current Facility</label>
                                <input type="text" name="currentFacility" value={formData.currentFacility} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Security Level</label>
                                <select name="securityLevel" value={formData.securityLevel} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="MINIMUM">Minimum</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="MAXIMUM">Maximum</option>
                                </select>
                            </div>
                            
                            <div className="col-span-2 mt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Register Inmate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
