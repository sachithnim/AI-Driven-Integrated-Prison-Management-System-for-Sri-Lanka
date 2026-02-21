import React, { useState, useEffect } from 'react';
import BackendRehabService from '../../services/rehab/backendRehabService';
import { Loader2, User, Activity, Calendar, AlertCircle, Eye, X, FileText, Stethoscope, MessageSquare, TrendingUp } from 'lucide-react';

export default function RehabInmates() {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInmate, setSelectedInmate] = useState(null);
    const [details, setDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            setLoading(true);
            const data = await BackendRehabService.getAllProfiles();
            setProfiles(data);
        } catch (err) {
            console.error("Failed to fetch rehab profiles:", err);
            setError("Failed to load rehabilitation profiles. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (inmateId) => {
        try {
            setLoadingDetails(true);
            setSelectedInmate(inmateId);
            
            const [recommendations, medicalReports, counselingNotes, progressLogs] = await Promise.all([
                BackendRehabService.getRecommendations(inmateId),
                BackendRehabService.getMedicalReports(inmateId),
                BackendRehabService.getCounselingNotes(inmateId),
                BackendRehabService.getProgressLogs(inmateId)
            ]);

            setDetails({
                recommendations,
                medicalReports,
                counselingNotes,
                progressLogs
            });
        } catch (err) {
            console.error("Failed to fetch details:", err);
            alert("Failed to load inmate details.");
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeDetails = () => {
        setSelectedInmate(null);
        setDetails(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">Loading profiles...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button 
                    onClick={fetchProfiles}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto relative">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Rehabilitation Profiles</h1>
                <p className="text-gray-600 mt-2">
                    Manage and view all inmate rehabilitation profiles and their current status.
                </p>
            </div>

            {profiles.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-gray-500">No rehabilitation profiles found.</p>
                </div>
            ) : (
                <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Inmate ID
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Suitability Group
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Risk Score
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last Updated
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {profiles.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <User className="h-5 w-5 text-blue-600" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">#{profile.inmateId}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                                                {profile.suitabilityGroup?.replace(/_/g, ' ') || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Activity className={`h-4 w-4 mr-2 ${
                                                    profile.riskScore > 0.7 ? 'text-red-500' : 
                                                    profile.riskScore > 0.4 ? 'text-yellow-500' : 'text-green-500'
                                                }`} />
                                                <span className="text-sm text-gray-900">{(profile.riskScore * 100).toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                                {new Date(profile.lastUpdated).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleViewDetails(profile.inmateId)}
                                                className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                            >
                                                <Eye className="w-4 h-4 mr-1" />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedInmate && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">Rehabilitation Details - Inmate #{selectedInmate}</h2>
                            <button onClick={closeDetails} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-grow">
                            {loadingDetails ? (
                                <div className="flex flex-col items-center justify-center h-64">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                    <p className="text-gray-600">Loading details...</p>
                                </div>
                            ) : details ? (
                                <div className="space-y-8">
                                    {/* Recommendations Section */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                            Program Recommendations
                                        </h3>
                                        {details.recommendations.length === 0 ? (
                                            <p className="text-gray-500 italic">No recommendations found.</p>
                                        ) : (
                                            <div className="grid gap-4">
                                                {details.recommendations.map((rec) => (
                                                    <div key={rec.id} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <h4 className="font-semibold text-blue-900">{rec.program?.name}</h4>
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                                rec.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
                                                            }`}>
                                                                {rec.status}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-blue-800 mb-2">{rec.program?.description}</p>
                                                        <div className="text-xs text-blue-600 grid grid-cols-2 gap-2">
                                                            <div>Duration: {rec.recommendedDurationWeeks} weeks</div>
                                                            <div>Confidence: {(rec.confidence * 100).toFixed(1)}%</div>
                                                            <div>Station: {rec.station?.name}</div>
                                                            <div>Officer: {rec.officer?.name}</div>
                                                        </div>
                                                        {rec.reasonExplainer && (
                                                            <div className="mt-3 text-xs text-gray-600 bg-white p-2 rounded border border-blue-100">
                                                                <strong>AI Reasoning:</strong> {rec.reasonExplainer}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    {/* Medical Reports Section */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <Stethoscope className="w-5 h-5 mr-2 text-red-600" />
                                            Medical Reports
                                        </h3>
                                        {details.medicalReports.length === 0 ? (
                                            <p className="text-gray-500 italic">No medical reports found.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {details.medicalReports.map((report) => (
                                                    <div key={report.id} className="bg-red-50 p-4 rounded-lg border border-red-100">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-medium text-red-900">{report.diagnosis}</span>
                                                            <span className="text-xs text-red-500">{new Date(report.reportDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{report.notes}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    {/* Counseling Notes Section */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                                            Counseling Notes
                                        </h3>
                                        {details.counselingNotes.length === 0 ? (
                                            <p className="text-gray-500 italic">No counseling notes found.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {details.counselingNotes.map((note) => (
                                                    <div key={note.id} className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-medium text-purple-900">Session Score: {note.sessionScore}</span>
                                                            <span className="text-xs text-purple-500">{new Date(note.sessionDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 mb-2">{note.text}</p>
                                                        {note.summary && (
                                                            <div className="text-xs text-purple-700 bg-white p-2 rounded border border-purple-100">
                                                                <strong>AI Analysis:</strong> {note.summary}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>

                                    {/* Progress Logs Section */}
                                    <section>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                                            Progress Logs
                                        </h3>
                                        {details.progressLogs.length === 0 ? (
                                            <p className="text-gray-500 italic">No progress logs found.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {details.progressLogs.map((log) => (
                                                    <div key={log.id} className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="font-medium text-green-900">{log.status} ({log.progressPercentage}%)</span>
                                                            <span className="text-xs text-green-500">{new Date(log.logDate).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-700">{log.notes}</p>
                                                        <div className="text-xs text-gray-500 mt-1">Recorded by: {log.recordedBy}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500">Failed to load details.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button 
                                onClick={closeDetails}
                                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
