import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, X, Save, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import InmateService from '../../services/inmate/inmateService';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

export default function Inmates() {
    const navigate = useNavigate();
    const [inmates, setInmates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const [importedData, setImportedData] = useState([]);
    const [importedImages, setImportedImages] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
    const [analyzingRowIndex, setAnalyzingRowIndex] = useState(null);
    const [formData, setFormData] = useState({
        bookingNumber: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: 'MALE',
        caseType: 'D_OTHER',
        convictionStatus: 'UNCONVICTED',
        sentenceStartDate: '',
        sentenceEndDate: '',
        sentenceDurationMonths: 0,
        securityLevel: 'MEDIUM',
        currentFacility: 'Main Prison',
        admissionDate: new Date().toISOString().split('T')[0],
        // New demographic fields
        religion: '',
        maritalStatus: '',
        literacyLevel: '',
        previousConvictions: 0,
        previousPunishments: '',
        incomeLevel: '',
        addictions: '',
        occupation: '',
        height: '',
        weight: '',
        eyeColor: '',
        hairColor: '',
        identifyingMarks: '',
        tattoos: '',
    });
    const backendBase = import.meta.env.VITE_INMATE_SERVICE_URL || '';
    const [closeFaceImage, setCloseFaceImage] = useState(null);
    const [closeFacePreview, setCloseFacePreview] = useState(null);
    const [fullBodyImage, setFullBodyImage] = useState(null);
    const [fullBodyPreview, setFullBodyPreview] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    const handleImageUpload = (e, imageType) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (imageType === 'closeFace') {
                setCloseFaceImage(file);
                setCloseFacePreview(reader.result);
            } else if (imageType === 'fullBody') {
                setFullBodyImage(file);
                setFullBodyPreview(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const uploadImages = async (inmateId) => {
        try {
            if (closeFaceImage) {
                await InmateService.uploadImage(inmateId, closeFaceImage, 'closeFace');
            }

            if (fullBodyImage) {
                await InmateService.uploadImage(inmateId, fullBodyImage, 'fullBody');
            }
        } catch (error) {
            console.error('Error uploading images:', error);
            toast.error('Failed to upload some images');
        }
    };

    const analyzePhysicalDescription = async () => {
        if (!closeFaceImage && !fullBodyImage) {
            toast.error('Please upload at least one image before running AI analysis');
            return;
        }

        try {
            setIsAnalyzingImages(true);
            const result = await InmateService.extractPhysicalDescription(closeFaceImage, fullBodyImage);
            setFormData(prev => ({
                ...prev,
                height: result.height || prev.height || '',
                weight: result.weight || prev.weight || '',
                eyeColor: result.eyeColor || prev.eyeColor || '',
                hairColor: result.hairColor || prev.hairColor || '',
                identifyingMarks: result.identifyingMarks || prev.identifyingMarks || '',
                tattoos: result.tattoos || prev.tattoos || '',
            }));
            toast.success('Physical description extracted from images');
        } catch (error) {
            console.error('Error analyzing inmate images:', error);
            toast.error(error?.response?.data?.message || 'Failed to analyze images');
        } finally {
            setIsAnalyzingImages(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await InmateService.createInmate(formData);
            const inmateId = response.id;
            await uploadImages(inmateId);
            toast.success("Inmate registered successfully");
            setIsModalOpen(false);
            fetchInmates();
            resetForm();
            setCloseFaceImage(null);
            setCloseFacePreview(null);
            setFullBodyImage(null);
            setFullBodyPreview(null);
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
            caseType: 'D_OTHER',
            convictionStatus: 'UNCONVICTED',
            sentenceStartDate: '',
            sentenceEndDate: '',
            sentenceDurationMonths: 0,
            securityLevel: 'MEDIUM',
            currentFacility: 'Main Prison',
            admissionDate: new Date().toISOString().split('T')[0],
            religion: '',
            maritalStatus: '',
            literacyLevel: '',
            previousConvictions: 0,
            previousPunishments: '',
            incomeLevel: '',
            addictions: '',
            occupation: '',
            height: '',
            weight: '',
            eyeColor: '',
            hairColor: '',
            identifyingMarks: '',
            tattoos: '',
        });
    };

    const filteredAndSorted = inmates
        .filter(inmate => 
            inmate.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inmate.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inmate.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => (b.id || 0) - (a.id || 0)); // Latest first (descending by id)

    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const filteredInmates = filteredAndSorted.slice(startIdx, startIdx + itemsPerPage);

    // Reset to page 1 when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleExcelFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                // Map Excel columns to inmate fields
                const mappedData = jsonData.map(row => ({
                    bookingNumber: row['Booking Number'] || row['bookingNumber'] || '',
                    firstName: row['First Name'] || row['firstName'] || '',
                    lastName: row['Last Name'] || row['lastName'] || '',
                    dateOfBirth: row['Date of Birth'] || row['dateOfBirth'] || '',
                    gender: row['Gender'] || row['gender'] || 'MALE',
                    caseType: row['Case Type'] || row['caseType'] || 'D_OTHER',
                    convictionStatus: row['Conviction Status'] || row['convictionStatus'] || 'UNCONVICTED',
                    sentenceStartDate: row['Sentence Start'] || row['sentenceStartDate'] || '',
                    sentenceEndDate: row['Sentence End'] || row['sentenceEndDate'] || '',
                    sentenceDurationMonths: parseInt(row['Duration (Months)'] || row['sentenceDurationMonths'] || 0),
                    securityLevel: row['Security Level'] || row['securityLevel'] || 'MEDIUM',
                    currentFacility: row['Current Facility'] || row['currentFacility'] || 'Main Prison',
                    admissionDate: row['Admission Date'] || row['admissionDate'] || new Date().toISOString().split('T')[0],
                    religion: row['Religion'] || row['religion'] || '',
                    maritalStatus: row['Marital Status'] || row['maritalStatus'] || '',
                    literacyLevel: row['Literacy Level'] || row['literacyLevel'] || '',
                    previousConvictions: parseInt(row['Previous Convictions'] || row['previousConvictions'] || 0),
                    previousPunishments: row['Previous Punishments'] || row['previousPunishments'] || '',
                    incomeLevel: row['Income Level'] || row['incomeLevel'] || '',
                    addictions: row['Addictions'] || row['addictions'] || '',
                    occupation: row['Occupation'] || row['occupation'] || '',
                    // Physical description — can be filled manually or via AI
                    height: row['Height'] || row['height'] || '',
                    weight: row['Weight'] || row['weight'] || '',
                    eyeColor: row['Eye Color'] || row['eyeColor'] || '',
                    hairColor: row['Hair Color'] || row['hairColor'] || '',
                    identifyingMarks: row['Identifying Marks'] || row['identifyingMarks'] || '',
                    tattoos: row['Tattoos'] || row['tattoos'] || '',
                }));

                setImportedData(mappedData);
                // initialize image slots for each imported row
                setImportedImages(mappedData.map(() => ({
                    closeFace: null,
                    fullBody: null,
                    closeFacePreview: null,
                    fullBodyPreview: null,
                })));
                setIsExcelModalOpen(true);
                toast.success(`Loaded ${mappedData.length} inmates from Excel`);
            } catch (error) {
                console.error("Error reading Excel file:", error);
                toast.error("Failed to read Excel file. Please check the format.");
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleEditImportedRow = (index, field, value) => {
        const updatedData = [...importedData];
        updatedData[index] = { ...updatedData[index], [field]: value };
        setImportedData(updatedData);
    };

    const handleImportedImageChange = (index, e, imageType) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size must be less than 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const imgs = [...importedImages];
            if (!imgs[index]) imgs[index] = { closeFace: null, fullBody: null, closeFacePreview: null, fullBodyPreview: null };
            if (imageType === 'closeFace') {
                imgs[index].closeFace = file;
                imgs[index].closeFacePreview = reader.result;
            } else if (imageType === 'fullBody') {
                imgs[index].fullBody = file;
                imgs[index].fullBodyPreview = reader.result;
            }
            setImportedImages(imgs);
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteImportedRow = (index) => {
        setImportedData(importedData.filter((_, i) => i !== index));
    };

    const analyzePhysicalDescriptionForRow = async (index) => {
        const imgs = importedImages[index];
        if (!imgs || (!imgs.closeFace && !imgs.fullBody)) {
            toast.error('Upload at least one image for this row before running AI analysis');
            return;
        }
        try {
            setAnalyzingRowIndex(index);
            const result = await InmateService.extractPhysicalDescription(imgs.closeFace, imgs.fullBody);
            const updatedData = [...importedData];
            updatedData[index] = {
                ...updatedData[index],
                height: result.height && result.height !== 'Unknown' ? result.height : updatedData[index].height,
                weight: result.weight && result.weight !== 'Unknown' ? result.weight : updatedData[index].weight,
                eyeColor: result.eyeColor && result.eyeColor !== 'Unknown' ? result.eyeColor : updatedData[index].eyeColor,
                hairColor: result.hairColor && result.hairColor !== 'Unknown' ? result.hairColor : updatedData[index].hairColor,
                identifyingMarks: result.identifyingMarks && result.identifyingMarks !== 'Unknown' ? result.identifyingMarks : updatedData[index].identifyingMarks,
                tattoos: result.tattoos && result.tattoos !== 'Unknown' ? result.tattoos : updatedData[index].tattoos,
            };
            setImportedData(updatedData);
            toast.success(`AI analysis complete for row ${index + 1}`);
        } catch (error) {
            console.error('Error analyzing images for row', index, error);
            toast.error(error?.response?.data?.message || `Failed to analyze images for row ${index + 1}`);
        } finally {
            setAnalyzingRowIndex(null);
        }
    };

    const handleBatchRegister = async () => {
        if (importedData.length === 0) {
            toast.error("No inmates to register");
            return;
        }

        setIsProcessing(true);
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < importedData.length; i++) {
            const inmateData = importedData[i];
            try {
                const response = await InmateService.createInmate(inmateData);
                const inmateId = response.id;

                // upload images for this imported row (if any)
                const imgs = importedImages[i];
                if (imgs) {
                    if (imgs.closeFace) {
                        await InmateService.uploadImage(inmateId, imgs.closeFace, 'closeFace');
                    }
                    if (imgs.fullBody) {
                        await InmateService.uploadImage(inmateId, imgs.fullBody, 'fullBody');
                    }
                }

                successCount++;
            } catch (error) {
                console.error(`Error registering ${inmateData.firstName} ${inmateData.lastName}:`, error);
                failureCount++;
            }
        }

        setIsProcessing(false);
        if (successCount > 0) {
            toast.success(`Successfully registered ${successCount} inmate(s)`);
        }
        if (failureCount > 0) {
            toast.error(`Failed to register ${failureCount} inmate(s)`);
        }

        setIsExcelModalOpen(false);
        setImportedData([]);
        fetchInmates();
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Inmate Management</h1>
                <div className="flex gap-3">
                    <label className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-green-700 cursor-pointer">
                        <Upload className="w-4 h-4" /> Import Excel
                        <input type="file" accept=".xlsx,.xls" onChange={handleExcelFileUpload} className="hidden" />
                    </label>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-slate-900 text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" /> Register Inmate
                    </button>
                </div>
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
                                            <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600 font-bold mr-3">
                                                {inmate.closeFaceImagePath ? (
                                                    <img
                                                        src={`${backendBase}/inmates/${inmate.id}/image/closeFace`}
                                                        alt="face"
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <>{inmate.firstName[0]}{inmate.lastName[0]}</>
                                                )}
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
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                        <div className="text-sm text-gray-600">
                            Showing <span className="font-medium">{startIdx + 1}</span> to <span className="font-medium">{Math.min(startIdx + itemsPerPage, filteredAndSorted.length)}</span> of <span className="font-medium">{filteredAndSorted.length}</span> inmates
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                                            currentPage === page
                                                ? 'bg-blue-600 text-white'
                                                : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto p-4 md:p-6">
                    <div className="bg-white rounded-lg w-full max-w-2xl mx-auto my-4 max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-bold">Register New Inmate</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-6 pb-6">
                        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                            {/* <div>
                                <label className="block text-sm font-medium text-gray-700">Booking Number</label>
                                <input type="text" name="bookingNumber" value={formData.bookingNumber} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div> */}
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
                                <label className="block text-sm font-medium text-gray-700">Conviction Status</label>
                                <select name="convictionStatus" value={formData.convictionStatus} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="UNCONVICTED">Unconvicted (Remand)</option>
                                    <option value="CONVICTED">Convicted (Sentenced)</option>
                                    <option value="APPEAL">Appeal</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Case Type</label>
                                <select name="caseType" value={formData.caseType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <optgroup label="A - Against Persons">
                                        <option value="A_MURDER">Murder</option>
                                        <option value="A_ATTEMPTED_MURDER">Attempted Murder</option>
                                        <option value="A_CULPABLE_HOMICIDE">Culpable Homicide</option>
                                        <option value="A_ATTEMPTED_CULPABLE_HOMICIDE">Attempted Culpable Homicide</option>
                                        <option value="A_KIDNAPPING">Kidnapping</option>
                                        <option value="A_RAPE">Rape</option>
                                        <option value="A_RAPE_CUSTODY">Rape - Person in Custody</option>
                                        <option value="A_RAPE_PREGNANT_WOMAN">Rape - Pregnant Woman</option>
                                        <option value="A_RAPE_WOMAN_OVER_18">Rape - Woman Over 18</option>
                                        <option value="A_RAPE_WOMAN_UNDER_18">Rape - Woman Under 18</option>
                                        <option value="A_RAPE_HANDICAPPED_WOMAN">Rape - Handicapped Woman</option>
                                        <option value="A_GANG_RAPE">Gang Rape</option>
                                        <option value="A_GRIEVOUS_HURT">Grievous Hurt</option>
                                        <option value="A_SIMPLE_HURT">Simple Hurt</option>
                                        <option value="A_BIGAMY">Bigamy</option>
                                        <option value="A_UNNATURAL_OFFENCE">Unnatural Offence</option>
                                        <option value="A_CONCEALMENT_OF_BIRTH">Concealment of Birth</option>
                                        <option value="A_CRIMINAL_FORCE">Criminal Force</option>
                                        <option value="A_CRIMINAL_INTIMIDATION">Criminal Intimidation</option>
                                        <option value="A_UNLAWFUL_INTERCOURSE">Unlawful Intercourse</option>
                                        <option value="A_ABORTION">Abortion / Attempt</option>
                                        <option value="A_ATTEMPT_SUICIDE">Attempt Suicide / Abetment</option>
                                        <option value="A_DEATH_BY_RECKLESS_DRIVING">Death by Reckless Driving</option>
                                        <option value="A_GRIEVOUS_INJURY_RECKLESS_DRIVING">Grievous Injury by Reckless Driving</option>
                                        <option value="A_SEXUAL_HARASSMENT">Sexual Harassment</option>
                                        <option value="A_GROSS_INDECENCY">Acts of Gross Indecency</option>
                                        <option value="A_SALE_OF_PERSON">Sale of Person</option>
                                        <option value="A_COURT_MARTIAL">Court Martial Punishment</option>
                                        <option value="A_OTHER_AGAINST_PERSONS">Other Against Persons</option>
                                    </optgroup>
                                    <optgroup label="B - Against Property">
                                        <option value="B_BURGLARY">Burglary</option>
                                        <option value="B_ROBBERY">Robbery</option>
                                        <option value="B_TRESPASS_HOUSE_BREAKING">Trespass / House Breaking</option>
                                        <option value="B_POSSESSION_HOUSEBREAKING_TOOLS">Possession of House Breaking Tools</option>
                                        <option value="B_EXTORTION">Extortion</option>
                                        <option value="B_LOOTING">Looting</option>
                                        <option value="B_CATTLE_THEFT">Cattle Theft</option>
                                        <option value="B_STOLEN_PROPERTY">Acceptance/Retention of Stolen Property</option>
                                        <option value="B_CHEATING">Cheating</option>
                                        <option value="B_CRIMINAL_BREACH_OF_TRUST">Criminal Breach of Trust</option>
                                        <option value="B_CRIMINAL_MISAPPROPRIATION">Criminal Misappropriation</option>
                                        <option value="B_ARSON">Arson</option>
                                        <option value="B_CAUSING_DAMAGE">Causing Damage</option>
                                        <option value="B_MISCHIEF">Mischief</option>
                                        <option value="B_FOUND_IN_BUILDINGS">Found in Buildings</option>
                                        <option value="B_THEFT">Theft</option>
                                        <option value="B_FORGERY">Forgery</option>
                                        <option value="B_COUNTERFEITING">Counterfeiting of Currency</option>
                                        <option value="B_BRIBERY">Bribery</option>
                                        <option value="B_CRUELTY_TO_ANIMALS">Cruelty to Animals</option>
                                        <option value="B_OTHER_AGAINST_PROPERTY">Other Against Property</option>
                                    </optgroup>
                                    <optgroup label="C - Public Tranquility / State Law">
                                        <option value="C_APPEARING_DRUNK">Appearing in Public Drunk</option>
                                        <option value="C_DISORDERLY_BEHAVIOUR">Disorderly Behaviour</option>
                                        <option value="C_CLEARING_CROWN_LAND">Clearing Crown Land</option>
                                        <option value="C_COMMITTING_AFFRAY">Committing Affray</option>
                                        <option value="C_ENTERING_PORT_WITHOUT_PERMIT">Entering Port without Permit</option>
                                        <option value="C_FAILURE_TO_REPORT_POLICE">Failure to Report to Police</option>
                                        <option value="C_FALSE_EVIDENCE">Giving False Evidence</option>
                                        <option value="C_LODGING_IN_VERANDAH">Lodging in Verandah</option>
                                        <option value="C_MANAGING_BROTHEL">Managing a Brothel</option>
                                        <option value="C_POSSESSING_PROHIBITED_KNIFE">Possessing Prohibited Knife</option>
                                        <option value="C_OBSTRUCTION_GOVT_OFFICERS">Obstruction of Govt Officers</option>
                                        <option value="C_PROFITEERING">Profiteering</option>
                                        <option value="C_RIOTING">Rioting</option>
                                        <option value="C_TRAVELLING_WITHOUT_TICKETS">Travelling without Tickets</option>
                                        <option value="C_UNLAWFUL_ASSEMBLY">Unlawful Assembly</option>
                                        <option value="C_UNLAWFUL_BETTING_GAMBLING">Unlawful Betting/Gambling</option>
                                        <option value="C_USING_EXPLOSIVES_FISHING">Using Explosives to Kill Fish</option>
                                        <option value="C_VIEWING_BLUE_FILMS">Viewing Blue Films</option>
                                        <option value="C_ILLEGAL_GEMMING">Illegally Gemming</option>
                                        <option value="C_UNLICENSED_FIREARMS">Unlicensed Firearms</option>
                                        <option value="C_NON_PAYMENT_INCOME_TAX">Non-payment of Income Tax</option>
                                        <option value="C_OTHER_PUBLIC_TRANQUILITY">Other Public Tranquility</option>
                                    </optgroup>
                                    <optgroup label="D - Other Accusations">
                                        <option value="D_EXCISE">Excise Accusation</option>
                                        <option value="D_MAINTENANCE">Maintenance</option>
                                        <option value="D_MOTOR_OFFENCE">Motor Accusation</option>
                                        <option value="D_NARCOTIC_DRUGS">Narcotic Drugs</option>
                                        <option value="D_OTHER">Other</option>
                                    </optgroup>
                                    <optgroup label="E - Special Regulations">
                                        <option value="E_EMERGENCY_REGULATIONS">Emergency Regulations</option>
                                        <option value="E_PREVENTION_OF_TERRORISM">Prevention of Terrorism</option>
                                    </optgroup>
                                    <optgroup label="F - Child Abuse">
                                        <option value="F_CHILDREN_PHOTOGRAPHY">Children for Photographic Publications</option>
                                        <option value="F_CRUELTY_TO_CHILDREN">Cruelty to Children</option>
                                        <option value="F_SEXUAL_ABUSE_CHILDREN">Sexual Abuse of Children</option>
                                        <option value="F_INCEST">Incest</option>
                                        <option value="F_CHILDREN_BEGGING">Children Involvement in Begging</option>
                                        <option value="F_SEXUAL_INTERCOURSE_CHILDREN">Sexual Intercourse with Children</option>
                                        <option value="F_CHILDREN_SEXUAL_ACTIVITIES">Children in Sexual Activities</option>
                                        <option value="F_CHILDREN_DRUG_TRAFFICKING">Children in Drug Trafficking</option>
                                        <option value="F_UNNATURAL_CHILDREN_UNDER_16">Unnatural Offence (Under 16)</option>
                                        <option value="F_GROSS_INDECENCY_CHILDREN_UNDER_16">Gross Indecency (Under 16)</option>
                                        <option value="F_PROCURATION">Procuration</option>
                                        <option value="F_SALE_OF_CHILDREN_UNDER_18">Sale of Children (Under 18)</option>
                                        <option value="F_RAPE_GIRL_UNDER_16">Rape of Girl (Under 16)</option>
                                    </optgroup>
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

                            {/* ── Demographic & Background Fields ── */}
                            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">Demographic & Background Information</h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Religion</label>
                                <select name="religion" value={formData.religion} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="Buddhist">Buddhist</option>
                                    <option value="Hindu">Hindu</option>
                                    <option value="Islam">Islam</option>
                                    <option value="Roman Catholic">Roman Catholic</option>
                                    <option value="Other Christian">Other Christian</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Marital Status</label>
                                <select name="maritalStatus" value={formData.maritalStatus} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="Never Married">Never Married</option>
                                    <option value="Married">Married</option>
                                    <option value="Widowed">Widowed</option>
                                    <option value="Divorced">Divorced</option>
                                    <option value="Legally Separated">Legally Separated</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Literacy Level</label>
                                <select name="literacyLevel" value={formData.literacyLevel} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="No Schooling">No Schooling</option>
                                    <option value="Grade 1-5">Grade 1–5</option>
                                    <option value="Passed Grade 5">Passed Grade 5</option>
                                    <option value="Passed Grade 8">Passed Grade 8</option>
                                    <option value="GCE O/L">Passed G.C.E. (O/L)</option>
                                    <option value="GCE A/L">Passed G.C.E. (A/L)</option>
                                    <option value="Graduate">Graduate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Previous Convictions</label>
                                <input type="number" name="previousConvictions" min="0" value={formData.previousConvictions} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Previous Punishments</label>
                                <select name="previousPunishments" value={formData.previousPunishments} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="None">None</option>
                                    <option value="Warned & Discharged">Warned & Discharged</option>
                                    <option value="Fined">Fined</option>
                                    <option value="Probation">Probation</option>
                                    <option value="Prison">Prison</option>
                                    <option value="Remand Custody">Remand Custody Before Conviction</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Income Level</label>
                                <select name="incomeLevel" value={formData.incomeLevel} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="No Income">No Income</option>
                                    <option value="Below Rs.3000/month">Below Rs.3,000/month</option>
                                    <option value="Rs.3000 & Over/month">Rs.3,000 & Over/month</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Addictions</label>
                                <select name="addictions" value={formData.addictions} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="None">None</option>
                                    <option value="Alcohol - Moderate">Alcohol (Moderate)</option>
                                    <option value="Alcohol - Excessive">Alcohol (Excessive)</option>
                                    <option value="Drugs - Moderate">Drugs (Moderate)</option>
                                    <option value="Drugs - Excessive">Drugs (Excessive)</option>
                                    <option value="Gambling - Moderate">Gambling (Moderate)</option>
                                    <option value="Gambling - Excessive">Gambling (Excessive)</option>
                                    <option value="Multiple">Multiple Addictions</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Occupation</label>
                                <select name="occupation" value={formData.occupation} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2">
                                    <option value="">-- Select --</option>
                                    <option value="Cultivator">Cultivator</option>
                                    <option value="Fisherman">Fisherman</option>
                                    <option value="Skilled Labour">Skilled Labour</option>
                                    <option value="Unskilled Labour">Unskilled Labour</option>
                                    <option value="Driver">Driver</option>
                                    <option value="Businessman">Businessman</option>
                                    <option value="Mason">Mason</option>
                                    <option value="Carpenter">Carpenter</option>
                                    <option value="Tailor">Tailor</option>
                                    <option value="Clerical">Clerical & Inspector</option>
                                    <option value="Housewife">Housewife</option>
                                    <option value="Student">Student</option>
                                    <option value="Armed Forces">Armed Forces</option>
                                    <option value="Police">Police</option>
                                    <option value="Unemployed">Unemployed</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* ── Photo & Identification Images ── */}
                            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-gray-700 mb-3">📸 Photo &amp; Identification Images</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Close Face */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Close Face Photo</label>
                                        <label className="flex flex-col items-center justify-center px-4 py-5 border-2 border-dashed border-blue-300 rounded-md cursor-pointer hover:bg-blue-50 transition-colors">
                                            <Upload className="w-5 h-5 text-blue-500 mb-1" />
                                            <span className="text-xs text-gray-500 text-center truncate w-full text-center">
                                                {closeFaceImage ? closeFaceImage.name : 'Click to upload'}
                                            </span>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'closeFace')} className="hidden" />
                                        </label>
                                        {closeFacePreview && (
                                            <div className="relative mt-2 inline-block">
                                                <img src={closeFacePreview} alt="Close Face" className="w-20 h-20 object-cover rounded-md border" />
                                                <button type="button" onClick={() => { setCloseFaceImage(null); setCloseFacePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {/* Full Body */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 mb-2">Full Body Photo</label>
                                        <label className="flex flex-col items-center justify-center px-4 py-5 border-2 border-dashed border-green-300 rounded-md cursor-pointer hover:bg-green-50 transition-colors">
                                            <Upload className="w-5 h-5 text-green-500 mb-1" />
                                            <span className="text-xs text-gray-500 text-center truncate w-full text-center">
                                                {fullBodyImage ? fullBodyImage.name : 'Click to upload'}
                                            </span>
                                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'fullBody')} className="hidden" />
                                        </label>
                                        {fullBodyPreview && (
                                            <div className="relative mt-2 inline-block">
                                                <img src={fullBodyPreview} alt="Full Body" className="w-20 h-20 object-cover rounded-md border" />
                                                <button type="button" onClick={() => { setFullBodyImage(null); setFullBodyPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* AI Analyze button — centered below the uploads */}
                                <div className="mt-3 flex justify-center">
                                    <button
                                        type="button"
                                        onClick={analyzePhysicalDescription}
                                        disabled={isAnalyzingImages || (!closeFaceImage && !fullBodyImage)}
                                        title={(!closeFaceImage && !fullBodyImage) ? 'Upload at least one image first' : 'Use AI to extract physical description from uploaded images'}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isAnalyzingImages ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                </svg>
                                                Analyzing Images…
                                            </>
                                        ) : (
                                            <>🤖 Analyze Images → Auto-fill Physical Description</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* ── Physical Description ── */}
                            <div className="col-span-2 border-t border-gray-200 pt-4 mt-2">
                                <h3 className="text-sm font-semibold text-gray-700 mb-1">Physical Description
                                    <span className="ml-2 text-xs font-normal text-gray-400">(auto-filled after AI analysis, editable)</span>
                                </h3>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Height</label>
                                <input type="text" name="height" value={formData.height} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="e.g. Approx. 170 cm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Weight</label>
                                <input type="text" name="weight" value={formData.weight} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="e.g. Approx. 68 kg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Eye Color</label>
                                <input type="text" name="eyeColor" value={formData.eyeColor} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hair Color</label>
                                <input type="text" name="hairColor" value={formData.hairColor} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Identifying Marks</label>
                                <textarea name="identifyingMarks" value={formData.identifyingMarks} onChange={handleInputChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Scars, birthmarks, tattoos, visible marks" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Tattoos</label>
                                <textarea name="tattoos" value={formData.tattoos} onChange={handleInputChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2" placeholder="Describe visible tattoos or write Unknown" />
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
                </div>
            )}

                {isExcelModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto p-4 md:p-6">
                        <div className="bg-white rounded-lg w-full max-w-6xl mx-auto my-4 max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100">
                                <div>
                                    <h2 className="text-xl font-bold">Review & Edit Imported Inmates</h2>
                                    <p className="text-sm text-gray-500 mt-1">{importedData.length} inmate(s) ready to register</p>
                                </div>
                                <button onClick={() => setIsExcelModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="overflow-x-auto flex-1 border-t border-gray-100">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 z-10">Booking #</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">First Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Name</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Case Type</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Conv. Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sent. Start</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sent. End</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Months</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Security</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Facility</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admission</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Religion</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Marital</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Literacy</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prev Conv</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Punish.</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Income</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Addictions</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Occupation</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Close Face</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Full Body</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase" title="Click 🤖 Analyze after uploading images to auto-fill">AI Analyze</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Height</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Weight</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Eye Color</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hair Color</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID Marks</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tattoos</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase sticky right-0 bg-gray-50 z-10">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {importedData.map((row, index) => (
                                            <tr key={index} className="hover:bg-gray-50 align-middle">
                                                <td className="px-3 py-2 sticky left-0 bg-white hover:bg-gray-50 z-10 border-r border-gray-200 whitespace-nowrap"><input type="text" value={row.bookingNumber} onChange={(e) => handleEditImportedRow(index, 'bookingNumber', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.firstName} onChange={(e) => handleEditImportedRow(index, 'firstName', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.lastName} onChange={(e) => handleEditImportedRow(index, 'lastName', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="date" value={row.dateOfBirth} onChange={(e) => handleEditImportedRow(index, 'dateOfBirth', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><select value={row.gender} onChange={(e) => handleEditImportedRow(index, 'gender', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"><option value="MALE">Male</option><option value="FEMALE">Female</option></select></td>
                                                <td className="px-3 py-2"><select value={row.caseType} onChange={(e) => handleEditImportedRow(index, 'caseType', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="A_MURDER">Murder</option><option value="A_RAPE">Rape</option><option value="B_THEFT">Theft</option><option value="B_ROBBERY">Robbery</option><option value="D_NARCOTIC_DRUGS">Narcotics</option><option value="D_OTHER">Other</option></select></td>
                                                <td className="px-3 py-2"><select value={row.convictionStatus} onChange={(e) => handleEditImportedRow(index, 'convictionStatus', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="UNCONVICTED">Unconvicted</option><option value="CONVICTED">Convicted</option><option value="APPEAL">Appeal</option></select></td>
                                                <td className="px-3 py-2"><input type="date" value={row.sentenceStartDate} onChange={(e) => handleEditImportedRow(index, 'sentenceStartDate', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="date" value={row.sentenceEndDate} onChange={(e) => handleEditImportedRow(index, 'sentenceEndDate', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="number" value={row.sentenceDurationMonths} onChange={(e) => handleEditImportedRow(index, 'sentenceDurationMonths', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><select value={row.securityLevel} onChange={(e) => handleEditImportedRow(index, 'securityLevel', e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"><option value="MINIMUM">Min</option><option value="MEDIUM">Med</option><option value="MAXIMUM">Max</option></select></td>
                                                <td className="px-3 py-2"><input type="text" value={row.currentFacility} onChange={(e) => handleEditImportedRow(index, 'currentFacility', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="date" value={row.admissionDate} onChange={(e) => handleEditImportedRow(index, 'admissionDate', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><select value={row.religion} onChange={(e) => handleEditImportedRow(index, 'religion', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="Buddhist">Buddhist</option><option value="Hindu">Hindu</option><option value="Islam">Islam</option><option value="Roman Catholic">Catholic</option></select></td>
                                                <td className="px-3 py-2"><select value={row.maritalStatus} onChange={(e) => handleEditImportedRow(index, 'maritalStatus', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="Never Married">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option></select></td>
                                                <td className="px-3 py-2"><select value={row.literacyLevel} onChange={(e) => handleEditImportedRow(index, 'literacyLevel', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="No Schooling">None</option><option value="Grade 1-5">1-5</option><option value="Passed Grade 8">Grade 8</option><option value="GCE O/L">O/L</option><option value="GCE A/L">A/L</option></select></td>
                                                <td className="px-3 py-2"><input type="number" value={row.previousConvictions} onChange={(e) => handleEditImportedRow(index, 'previousConvictions', parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><select value={row.previousPunishments} onChange={(e) => handleEditImportedRow(index, 'previousPunishments', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="None">None</option><option value="Fined">Fined</option><option value="Probation">Probation</option><option value="Prison">Prison</option></select></td>
                                                <td className="px-3 py-2"><select value={row.incomeLevel} onChange={(e) => handleEditImportedRow(index, 'incomeLevel', e.target.value)} className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="No Income">None</option><option value="Below Rs.3000/month">Below 3K</option><option value="Rs.3000 & Over/month">3K+</option></select></td>
                                                <td className="px-3 py-2"><select value={row.addictions} onChange={(e) => handleEditImportedRow(index, 'addictions', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="None">None</option><option value="Alcohol - Moderate">Alc Mod</option><option value="Alcohol - Excessive">Alc Exc</option><option value="Drugs - Excessive">Drugs Exc</option></select></td>
                                                <td className="px-3 py-2"><select value={row.occupation} onChange={(e) => handleEditImportedRow(index, 'occupation', e.target.value)} className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"><option value="">--</option><option value="Driver">Driver</option><option value="Tailor">Tailor</option><option value="Unemployed">Unemployed</option><option value="Other">Other</option></select></td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <label className="inline-flex items-center justify-center h-8 w-20 text-xs border rounded bg-gray-50 cursor-pointer overflow-hidden">
                                                            Choose
                                                            <input type="file" accept="image/*" onChange={(e) => handleImportedImageChange(index, e, 'closeFace')} className="hidden" />
                                                        </label>
                                                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                            {importedImages[index]?.closeFacePreview ? (
                                                                <img src={importedImages[index].closeFacePreview} alt="close-face" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="text-gray-400 text-xs">No image</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <label className="inline-flex items-center justify-center h-8 w-20 text-xs border rounded bg-gray-50 cursor-pointer overflow-hidden">
                                                            Choose
                                                            <input type="file" accept="image/*" onChange={(e) => handleImportedImageChange(index, e, 'fullBody')} className="hidden" />
                                                        </label>
                                                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                            {importedImages[index]?.fullBodyPreview ? (
                                                                <img src={importedImages[index].fullBodyPreview} alt="full-body" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="text-gray-400 text-xs">No image</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => analyzePhysicalDescriptionForRow(index)}
                                                        disabled={analyzingRowIndex === index || (!importedImages[index]?.closeFace && !importedImages[index]?.fullBody)}
                                                        title={(!importedImages[index]?.closeFace && !importedImages[index]?.fullBody) ? 'Upload an image first' : 'Extract physical description from images using AI'}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                                                    >
                                                        {analyzingRowIndex === index ? (
                                                            <>
                                                                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                                                </svg>
                                                                Analyzing…
                                                            </>
                                                        ) : '🤖 Analyze'}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2"><input type="text" value={row.height || ''} onChange={(e) => handleEditImportedRow(index, 'height', e.target.value)} placeholder="e.g. 170 cm" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.weight || ''} onChange={(e) => handleEditImportedRow(index, 'weight', e.target.value)} placeholder="e.g. 68 kg" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.eyeColor || ''} onChange={(e) => handleEditImportedRow(index, 'eyeColor', e.target.value)} placeholder="Eye color" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.hairColor || ''} onChange={(e) => handleEditImportedRow(index, 'hairColor', e.target.value)} placeholder="Hair color" className="w-24 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.identifyingMarks || ''} onChange={(e) => handleEditImportedRow(index, 'identifyingMarks', e.target.value)} placeholder="Scars, marks…" className="w-32 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2"><input type="text" value={row.tattoos || ''} onChange={(e) => handleEditImportedRow(index, 'tattoos', e.target.value)} placeholder="Tattoos…" className="w-32 px-2 py-1 border border-gray-300 rounded text-sm" /></td>
                                                <td className="px-3 py-2 text-center sticky right-0 bg-white hover:bg-gray-50 z-10 border-l border-gray-200"><button onClick={() => handleDeleteImportedRow(index)} className="text-red-600 hover:text-red-900 inline-flex" title="Remove this row"><Trash2 className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-white">
                                <button
                                    onClick={() => setIsExcelModalOpen(false)}
                                    disabled={isProcessing}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBatchRegister}
                                    disabled={isProcessing || importedData.length === 0}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save className="w-4 h-4" />
                                    {isProcessing ? `Processing (${importedData.length})...` : `Register ${importedData.length} Inmate(s)`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
