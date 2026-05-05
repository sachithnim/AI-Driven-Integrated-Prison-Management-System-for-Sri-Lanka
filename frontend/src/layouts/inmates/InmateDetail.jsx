import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Shield, MapPin, Calendar, FileText, Fingerprint } from 'lucide-react';
import InmateService from '../../services/inmate/inmateService';
import toast from 'react-hot-toast';

export default function InmateDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inmate, setInmate] = useState(null);
    const [loading, setLoading] = useState(true);
    const backendBase = import.meta.env.VITE_INMATE_SERVICE_URL || '';

    useEffect(() => {
        const fetchInmate = async () => {
            try {
                const data = await InmateService.getInmateById(id);
                setInmate(data);
            } catch (error) {
                console.error("Error fetching inmate:", error);
                toast.error("Failed to load inmate details");
            } finally {
                setLoading(false);
            }
        };
        fetchInmate();
    }, [id]);

    if (loading) return <div className="p-6 text-center py-10">Loading inmate details...</div>;
    if (!inmate) return <div className="p-6 text-center py-10 text-red-500">Inmate not found.</div>;

    const securityColor = {
        MAXIMUM: 'bg-red-100 text-red-800',
        MEDIUM: 'bg-yellow-100 text-yellow-800',
        MINIMUM: 'bg-green-100 text-green-800',
    }[inmate.securityLevel] || 'bg-gray-100 text-gray-800';

    const statusColor = inmate.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/inmates')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
            >
                <ArrowLeft className="w-4 h-4" /> Back to Inmates
            </button>

            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-gray-600 text-2xl font-bold">
                        {inmate.closeFaceImagePath ? (
                            <img
                                src={`${backendBase}/inmates/${id}/image/closeFace`}
                                alt="Close face"
                                className="h-full w-full object-cover"
                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
                            />
                        ) : (
                            <>{inmate.firstName?.[0]}{inmate.lastName?.[0]}</>
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{inmate.firstName} {inmate.lastName}</h1>
                        <p className="text-gray-500 text-sm">{inmate.bookingNumber}</p>
                        <div className="flex gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor}`}>
                                {inmate.status}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${securityColor}`}>
                                {inmate.securityLevel}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Image gallery */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
                <div className="flex gap-4">
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Close Face</p>
                        {inmate.closeFaceImagePath ? (
                            <img src={`${backendBase}/inmates/${id}/image/closeFace`} alt="Close face" className="w-40 h-40 object-cover rounded-md border" />
                        ) : (
                            <div className="w-40 h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">No image</div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 mb-2">Full Body</p>
                        {inmate.fullBodyImagePath ? (
                            <img src={`${backendBase}/inmates/${id}/image/fullBody`} alt="Full body" className="w-40 h-40 object-cover rounded-md border" />
                        ) : (
                            <div className="w-40 h-40 bg-gray-100 rounded-md flex items-center justify-center text-gray-400">No image</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" /> Personal Information
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Full Name</dt>
                            <dd className="font-medium text-gray-900">{inmate.firstName} {inmate.lastName}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Date of Birth</dt>
                            <dd className="font-medium text-gray-900">{inmate.dateOfBirth}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Age</dt>
                            <dd className="font-medium text-gray-900">{inmate.age} yrs</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Gender</dt>
                            <dd className="font-medium text-gray-900">{inmate.gender}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5" /> Location
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Facility</dt>
                            <dd className="font-medium text-gray-900">{inmate.currentFacility}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Block</dt>
                            <dd className="font-medium text-gray-900">{inmate.block}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Cell Number</dt>
                            <dd className="font-medium text-gray-900">{inmate.cellNumber}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Case Information
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Case Type</dt>
                            <dd className="font-medium text-gray-900">{inmate.caseType?.replace(/_/g, ' ')}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Security Level</dt>
                            <dd className="font-medium text-gray-900">{inmate.securityLevel}</dd>
                        </div>
                    </dl>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> Sentence Details
                    </h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Conviction Status</dt>
                            <dd>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    inmate.convictionStatus === 'CONVICTED' ? 'bg-red-100 text-red-700' :
                                    inmate.convictionStatus === 'APPEAL' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {inmate.convictionStatus || 'UNCONVICTED'}
                                </span>
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Admission Date</dt>
                            <dd className="font-medium text-gray-900">{inmate.admissionDate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Sentence Start</dt>
                            <dd className="font-medium text-gray-900">{inmate.sentenceStartDate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Sentence End</dt>
                            <dd className="font-medium text-gray-900">{inmate.sentenceEndDate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Duration</dt>
                            <dd className="font-medium text-gray-900">{inmate.sentenceDurationMonths} months</dd>
                        </div>
                    </dl>
                </div>

                {/* Demographic & Background Information */}
                <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" /> Demographic & Background
                    </h2>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <dt className="text-gray-500">Religion</dt>
                            <dd className="font-medium text-gray-900">{inmate.religion || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Marital Status</dt>
                            <dd className="font-medium text-gray-900">{inmate.maritalStatus || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Literacy Level</dt>
                            <dd className="font-medium text-gray-900">{inmate.literacyLevel || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Previous Convictions</dt>
                            <dd className="font-medium text-gray-900">{inmate.previousConvictions ?? '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Previous Punishments</dt>
                            <dd className="font-medium text-gray-900">{inmate.previousPunishments || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Income Level</dt>
                            <dd className="font-medium text-gray-900">{inmate.incomeLevel || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Addictions</dt>
                            <dd className="font-medium text-gray-900">{inmate.addictions || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Occupation</dt>
                            <dd className="font-medium text-gray-900">{inmate.occupation || '—'}</dd>
                        </div>
                    </dl>
                </div>

                {/* Physical Description */}
                <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
                    <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Fingerprint className="w-5 h-5" /> Physical Description
                    </h2>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <dt className="text-gray-500">Height</dt>
                            <dd className="font-medium text-gray-900">{inmate.height || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Weight</dt>
                            <dd className="font-medium text-gray-900">{inmate.weight || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Eye Color</dt>
                            <dd className="font-medium text-gray-900">{inmate.eyeColor || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Hair Color</dt>
                            <dd className="font-medium text-gray-900">{inmate.hairColor || '—'}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-gray-500">Identifying Marks</dt>
                            <dd className="font-medium text-gray-900 mt-1 whitespace-pre-line">{inmate.identifyingMarks || '—'}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-gray-500">Tattoos</dt>
                            <dd className="font-medium text-gray-900 mt-1 whitespace-pre-line">{inmate.tattoos || '—'}</dd>
                        </div>
                    </dl>
                </div>
            </div>
        </div>
    );
}
