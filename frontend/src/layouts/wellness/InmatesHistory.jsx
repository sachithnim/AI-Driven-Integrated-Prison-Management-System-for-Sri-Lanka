import React, { useState, useEffect } from 'react';
import { Users, Search, History, ChevronRight, Activity, FileText, BarChart3, Clock } from 'lucide-react';
import createApiClient from '../../services/axiosInstance';
import toast from 'react-hot-toast';
import Button from '../../components/button/Button';

export default function Inmates() {
  const [inmates, setInmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInmateId, setSelectedInmateId] = useState(null);
  const [historyData, setHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const axiosInstance = createApiClient();


  useEffect(() => {
    fetchInmates();
  }, []);

  const fetchInmates = async () => {
    try {
      const res = await axiosInstance.get('http://127.0.0.1:5010/api/history/inmates');
      setInmates(res.data.inmates);
    } catch (err) {
        console.error('Error fetching inmates:', err);
      toast.error('Failed to load inmates mapping.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectInmate = async (id) => {
    setSelectedInmateId(id);
    setHistoryLoading(true);
    try {
      const res = await axiosInstance.get(`http://127.0.0.1:5010/api/history/inmate/${id}`);
      setHistoryData(res.data);
    } catch (err) {
      console.error('Error fetching inmate history:', err);
      toast.error('Failed to load inmate history.');
      setSelectedInmateId(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (selectedInmateId && historyLoading) {
    return <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[50vh]">
        <Activity className="w-10 h-10 animate-bounce text-blue-500 mb-4" />
        Pulling historical data and loading saved AI analysis...
    </div>;
  }

  if (selectedInmateId && historyData) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => setSelectedInmateId(null)} className="mb-4">
            &larr; Back to Directory
        </Button>

        <div className="bg-white rounded-xl shadow-sm p-8 border border-slate-200">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg text-white font-bold text-2xl">
                    {historyData.name.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">{historyData.name}</h1>
                    <p className="text-slate-500">
                      ID: #{historyData.id} • {historyData.gender} • {historyData.age} yrs • Initial Emotion: <span className="font-semibold text-indigo-600">{historyData.initial_visual_emotion}</span>
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Q&A Timeline */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-500"/> Survey Timeline
                    </h3>
                    {historyData.qa_history.length === 0 ? (
                        <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg">No survey answers recorded yet.</p>
                    ) : (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {historyData.qa_history.map((qa, idx) => (
                                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-semibold text-slate-800 flex-1 pr-4">{qa.question}</p>
                                        {qa.timestamp && <span className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(qa.timestamp).toLocaleTimeString()}</span>}
                                    </div>
                                    <div className="flex justify-between items-end mt-3">
                                        <p className="text-sm text-indigo-700 font-medium bg-indigo-50 px-3 py-1.5 rounded-md inline-block">
                                            "{qa.answer}"
                                        </p>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            Voice: <span className="font-semibold text-slate-700">{qa.voice_emotion}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {historyData.ocr_prescription && historyData.ocr_prescription.trim() && (
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3">
                                <FileText className="w-5 h-5 text-indigo-500"/> Extracted Medical Records
                            </h3>
                            <div className="bg-slate-50 text-xs text-slate-600 font-mono p-4 rounded-lg overflow-y-auto max-h-40 border border-slate-200">
                                {historyData.ocr_prescription}
                            </div>
                        </div>
                    )}
                </div>

                {/* Final AI Generated Report */}
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-indigo-500"/> Retrospective AI Health Timelines
                    </h3>

                    {historyData.reports && historyData.reports.length > 0 ? (
                        <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2">
                            {historyData.reports.map((reportItem, idx) => (
                                <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative">
                                    <div className="absolute top-0 right-0 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-bl-lg rounded-tr-xl text-xs font-bold">
                                        {reportItem.timestamp || `Assessment #${idx + 1}`}
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-4 pr-32">
                                        Analysis Record
                                        {reportItem.progress_indicator && (
                                            <span className="ml-3 text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                                                Trend: {reportItem.progress_indicator}
                                            </span>
                                        )}
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                                            <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Risk Assessment</p>
                                            <span className={`text-lg font-black ${
                                                reportItem.risk_level === 'High' ? 'text-red-600' :
                                                reportItem.risk_level === 'Medium' ? 'text-orange-500' :
                                                'text-emerald-500'
                                            }`}>
                                                {reportItem.risk_level}
                                            </span>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Likely Conditions</p>
                                            <div className="flex flex-wrap gap-2">
                                                {reportItem.suspected_conditions?.length > 0 ? (
                                                    reportItem.suspected_conditions.map((c, i) => (
                                                        <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">{c}</span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400">None</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">AI Reasoning</p>
                                            <p className="text-slate-600 text-xs leading-relaxed">
                                                {reportItem.reasoning || "No reasoning provided."}
                                            </p>
                                        </div>

                                        {reportItem.recommended_actions?.length > 0 && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <p className="text-xs font-semibold text-slate-500 tracking-wider uppercase mb-2">Action Plan</p>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {reportItem.recommended_actions.map((act, i) => (
                                                        <li key={i} className="text-xs text-slate-600">{act}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {reportItem.urgent_alert && (
                                            <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
                                                <Activity className="w-4 h-4 animate-pulse" /> Urgent Medical Intervention Flagged
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 text-center py-6">No historical AI analysis records found.</p>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Directory View
  return (
    <div className="space-y-6">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200/60">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2 flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
            <History className="w-8 h-8 text-white drop-shadow-md" />
          </div>
          Inmates History

        </h1>
        <p className="text-slate-600">Review past mental health assessments and historical records.</p>
      </div>

      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/40 p-8 border border-slate-200/60">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading directory...</div>
        ) : inmates.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No inmates found in the system. Check back later.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Age</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Initial Emotion</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inmates.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => handleSelectInmate(i.id)}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-500">#{i.id}</td>
                  <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {i.name.charAt(0)}
                    </div>
                    {i.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">{i.age}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{i.gender}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 capitalize">
                    {i.visual_emotion && i.visual_emotion !== 'Unknown' ? (
                        <span className="px-2 py-1 bg-slate-100 rounded text-slate-600 text-xs font-semibold">{i.visual_emotion}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 font-medium text-sm flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        View History <ChevronRight className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
