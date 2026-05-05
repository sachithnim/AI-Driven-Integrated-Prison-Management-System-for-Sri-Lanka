import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import StaffService from "../../services/inmate/staffService";
import InmateProgressDashboard from "./InmateProgressDashboard";
import {
  Loader2,
  MessageSquare,
  Upload,
  Activity,
  BarChart2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Send,
  FileImage,
  HeartPulse,
} from "lucide-react";

const TABS = [
  { id: "counseling", label: "Counseling Analysis", icon: MessageSquare },
  { id: "medical", label: "Medical Report", icon: HeartPulse },
  { id: "progress", label: "Progress Log", icon: Activity },
  { id: "dashboard", label: "Progress Dashboard", icon: BarChart2 },
];

const SentimentBadge = ({ sentiment }) => {
  const colors = {
    positive: "bg-green-100 text-green-800",
    negative: "bg-red-100 text-red-800",
    neutral: "bg-gray-100 text-gray-700",
    mixed: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        colors[sentiment] || colors.neutral
      }`}
    >
      {sentiment}
    </span>
  );
};

function CounselingTab() {
  const [inmateId, setInmateId] = useState("");
  const [inmates, setInmates] = useState([]);
  const [counselors, setCounselors] = useState([]);
  const [counselorId, setCounselorId] = useState("");

  useEffect(() => {
    InmateService.getAllInmates().then(setInmates).catch(console.error);
    StaffService.getStaffByRole("COUNSELOR").then(setCounselors).catch(console.error);
  }, []);
  const [sessionType, setSessionType] = useState("individual");
  const [sessionScore, setSessionScore] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!inmateId.trim() || !text.trim()) {
      alert("Inmate ID and session notes are required.");
      return;
    }
    try {
      setLoading(true);
      setResult(null);
      const payload = {
        inmateId: inmateId.trim(),
        counselorId: counselorId.trim(),
        sessionType,
        text,
        sessionScore: sessionScore !== "" ? parseFloat(sessionScore) : undefined,
      };
      const data = await BackendRehabService.addCounselingNoteWithAnalysis(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      alert("Failed to submit counseling note.");
    } finally {
      setLoading(false);
    }
  };

  const analysis = result?.analysis || null;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Add Counseling Session Note</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Inmate ID <span className="text-red-500">*</span>
            </label>
            <select
              value={inmateId}
              onChange={(e) => setInmateId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Inmate --</option>
              {inmates.map((inmate) => (
                <option key={inmate.id} value={inmate.id?.toString()}>
                  {inmate.id} — {inmate.firstName} {inmate.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Counselor <span className="text-red-500">*</span>
            </label>
            <select
              value={counselorId}
              onChange={(e) => setCounselorId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Counselor --</option>
              {counselors.map((c) => (
                <option key={c.id} value={c.staffId}>
                  {c.firstName} {c.lastName} ({c.staffId})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Type
            </label>
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="individual">Individual</option>
              <option value="group">Group</option>
              <option value="family">Family</option>
              <option value="assessment">Assessment</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Score (0-10)
          </label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            value={sessionScore}
            onChange={(e) => setSessionScore(e.target.value)}
            placeholder="e.g. 7.5"
            className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Session Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Describe the session observations, inmate's behaviour, responses, concerns…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? "Analyzing…" : "Submit & Analyze"}
        </button>
      </div>

      {/* Analysis Result */}
      {analysis && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AI Analysis</h3>
            <SentimentBadge sentiment={analysis.sentiment} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Sentiment Score</div>
              <div className="text-xl font-bold text-gray-900">
                {(analysis.score * 100).toFixed(0)}%
              </div>
            </div>
            {analysis.risk_level && (
              <div
                className={`rounded-lg p-3 text-center ${
                  analysis.risk_level === "high"
                    ? "bg-red-50"
                    : analysis.risk_level === "medium"
                    ? "bg-yellow-50"
                    : "bg-green-50"
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">Risk Level</div>
                <div className="text-sm font-bold capitalize text-gray-900">
                  {analysis.risk_level}
                </div>
              </div>
            )}
          </div>

          {analysis.themes?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Key Themes
              </p>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((t, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.risk_indicators?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                Risk Indicators
              </p>
              <ul className="space-y-1">
                {analysis.risk_indicators.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.protective_factors?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                Protective Factors
              </p>
              <ul className="space-y-1">
                {analysis.protective_factors.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-green-700">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis.recommendations?.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-2">
                Recommendations
              </p>
              <ul className="space-y-1">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-blue-800">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgressTab() {
  const [inmates, setInmates] = useState([]);
  const [jailors, setJailors] = useState([]);
  const [selectedInmate, setSelectedInmate] = useState("");
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationId, setRecommendationId] = useState("");
  const [status, setStatus] = useState("SATISFACTORY");
  const [percentage, setPercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [recordedBy, setRecordedBy] = useState("");
  const [activityType, setActivityType] = useState("program_activity");
  const [participationScore, setParticipationScore] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    InmateService.getAllInmates().then(setInmates).catch(console.error);
    StaffService.getStaffByRole("JAILOR").then(setJailors).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedInmate) {
      BackendRehabService.getRecommendations(selectedInmate)
        .then((recs) => {
          setRecommendations(recs || []);
          if (recs?.length > 0) setRecommendationId(recs[0].id?.toString() || "");
        })
        .catch(() => setRecommendations([]));
    } else {
      setRecommendations([]);
      setRecommendationId("");
    }
  }, [selectedInmate]);

  const handleSubmit = async () => {
    if (!recommendationId) {
      alert("Please select an inmate and recommendation.");
      return;
    }
    try {
      setLoading(true);
      setSuccess(false);
      await BackendRehabService.logProgress({
        recommendationId: parseInt(recommendationId),
        status,
        progressPercentage: percentage !== "" ? parseInt(percentage) : undefined,
        notes: `[${activityType}]${participationScore ? ` [participation:${participationScore}/10]` : ""} ${notes}`,
        recordedBy,
      });
      setSuccess(true);
      setNotes("");
      setPercentage("");
      setParticipationScore("");
    } catch (err) {
      console.error(err);
      alert("Failed to log progress.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Log Rehabilitation Progress</h3>

      {success && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
          <CheckCircle className="w-4 h-4" />
          Progress log saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Inmate <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedInmate}
            onChange={(e) => setSelectedInmate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Inmate --</option>
            {inmates.map((inmate) => (
              <option key={inmate.id} value={inmate.id?.toString()}>
                {inmate.id} — {inmate.firstName} {inmate.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommendation / Program <span className="text-red-500">*</span>
          </label>
          <select
            value={recommendationId}
            onChange={(e) => setRecommendationId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select --</option>
            {recommendations.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {r.program?.name || r.program?.type || "Program"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Activity Type</label>
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="program_activity">Program Activity</option>
            <option value="vocational_training">Vocational Training (NVQ)</option>
            <option value="counseling_session">Counseling Session</option>
            <option value="meditation">Meditation / Mindfulness</option>
            <option value="cultural_program">Cultural Program</option>
            <option value="education">Education Class</option>
            <option value="physical_activity">Physical Activity</option>
            <option value="community_service">Community Service</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="EXCELLENT">Excellent</option>
            <option value="GOOD">Good</option>
            <option value="SATISFACTORY">Satisfactory</option>
            <option value="NEEDS_IMPROVEMENT">Needs Improvement</option>
            <option value="POOR">Poor</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Progress %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="0–100"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Participation (0-10)</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={participationScore}
            onChange={(e) => setParticipationScore(e.target.value)}
            placeholder="e.g. 8"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recorded By</label>
          <select
            value={recordedBy}
            onChange={(e) => setRecordedBy(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Officer --</option>
            {jailors.map((j) => (
              <option key={j.id} value={j.staffId}>
                {j.firstName} {j.lastName} ({j.staffId})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Session observations, milestones reached, inmate engagement level…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          {loading ? "Saving…" : "Log Progress"}
        </button>
      </div>
    </div>
  );
}

function MedicalTab() {
  const [inmates, setInmates] = useState([]);
  const [medicalOfficers, setMedicalOfficers] = useState([]);
  const [selectedInmate, setSelectedInmate] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    InmateService.getAllInmates().then(setInmates).catch(console.error);
    StaffService.getStaffByRole("MEDICAL_OFFICER").then(setMedicalOfficers).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!selectedInmate || !diagnosis.trim() || !notes.trim()) {
      alert("Inmate, Diagnosis, and Notes are required.");
      return;
    }
    try {
      setLoading(true);
      setSuccess(false);
      await BackendRehabService.addMedicalReport({
        inmateId: selectedInmate,
        officerId,
        diagnosis,
        notes,
        vitals: {
          bloodPressure: bloodPressure || undefined,
          heartRate: heartRate ? parseInt(heartRate) : undefined,
        }
      });
      setSuccess(true);
      setDiagnosis("");
      setNotes("");
      setBloodPressure("");
      setHeartRate("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit medical report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h3 className="font-semibold text-gray-900">Add Medical Report</h3>

      {success && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
          <CheckCircle className="w-4 h-4" />
          Medical report saved successfully.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Inmate <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedInmate}
            onChange={(e) => setSelectedInmate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Inmate --</option>
            {inmates.map((inmate) => (
              <option key={inmate.id} value={inmate.id?.toString()}>
                {inmate.id} — {inmate.firstName} {inmate.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Medical Officer
          </label>
          <select
            value={officerId}
            onChange={(e) => setOfficerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Officer --</option>
            {medicalOfficers.map((m) => (
              <option key={m.id} value={m.staffId}>
                {m.firstName} {m.lastName} ({m.staffId})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blood Pressure
          </label>
          <input
            type="text"
            value={bloodPressure}
            onChange={(e) => setBloodPressure(e.target.value)}
            placeholder="120/80"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Heart Rate (bpm)
          </label>
          <input
            type="number"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            placeholder="72"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Primary diagnosis or condition..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Notes <span className="text-red-500">*</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Detailed observations, treatment plan, medication prescribed..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
          {loading ? "Saving…" : "Save Medical Report"}
        </button>
      </div>
    </div>
  );
}

export default function RehabProgress() {
  const [searchParams] = useSearchParams();
  const inmateIdParam = searchParams.get("inmateId");
  const [activeTab, setActiveTab] = useState(inmateIdParam ? "dashboard" : "counseling");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => (window.location.href = "/rehabilitation")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Progress Tracker</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            AI-powered counseling analysis and progress logging
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "counseling" && <CounselingTab />}
      {activeTab === "medical" && <MedicalTab />}
      {activeTab === "progress" && <ProgressTab />}
      {activeTab === "dashboard" && <InmateProgressDashboard inmateId={inmateIdParam} />}
    </div>
  );
}
