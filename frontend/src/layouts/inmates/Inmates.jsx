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
