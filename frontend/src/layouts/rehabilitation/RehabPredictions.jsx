import React, { useState, useEffect } from "react";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import {
  Loader2,
  ArrowLeft,
  Calendar,
  Award,
  Home,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Star,
  BarChart2,
  Play,
} from "lucide-react";

const DEFAULT_FORM = {
  inmateId: "",
  sentenceLengthMonths: "",
  timeServedMonths: "",
  crimeCategories: "",
  isCapitalOffence: false,
  behaviorScore: "",
  disciplineScore: "",
  incidentCount: "",
  violenceRisk: "",
  programsCompleted: "",
  educationLevel: "",
  employmentHistory: "",
  substanceAbuse: false,
  mentalHealthCondition: false,
  familySupport: "",
  communitySupport: "",
  rehabParticipationScore: "",
  counselingSessionsAttended: "",
  rehabCompletionRate: "",
  aiEligibilityScore: "",
  priorConvictions: "",
  recidivismRisk: "",
  age: "",
};

const FIELD_LABELS = {
  inmateId: "Inmate ID *",
  sentenceLengthMonths: "Sentence Length (months)",
  timeServedMonths: "Time Served (months)",
  crimeCategories: "Crime Categories (comma-separated)",
  isCapitalOffence: "Capital Offence?",
  behaviorScore: "Behavior Score (0-10)",
  disciplineScore: "Discipline Score (0-10)",
  incidentCount: "Total Incidents",
  violenceRisk: "Violence Risk (0.0-1.0)",
  programsCompleted: "Programs Completed",
  educationLevel: "Education Level",
  employmentHistory: "Employment History",
  substanceAbuse: "Substance Abuse History?",
  mentalHealthCondition: "Mental Health Condition?",
  familySupport: "Family Support (0.0-1.0)",
  communitySupport: "Community Support (0.0-1.0)",
  rehabParticipationScore: "Rehab Participation Score",
  counselingSessionsAttended: "Counseling Sessions Attended",
  rehabCompletionRate: "Rehab Completion Rate (0.0-1.0)",
  aiEligibilityScore: "AI Eligibility Score (0.0-1.0)",
  priorConvictions: "Prior Convictions",
  recidivismRisk: "Recidivism Risk (0.0-1.0)",
  age: "Age",
};

const BOOLEAN_FIELDS = ["isCapitalOffence", "substanceAbuse", "mentalHealthCondition"];
const NUMBER_FIELDS = [
  "sentenceLengthMonths","timeServedMonths","behaviorScore","disciplineScore",
  "incidentCount","violenceRisk","programsCompleted","familySupport",
  "communitySupport","rehabParticipationScore","counselingSessionsAttended",
  "rehabCompletionRate","aiEligibilityScore","priorConvictions","recidivismRisk","age",
];

function ProbabilityBar({ value, color = "blue" }) {
  const pct = Math.round((value || 0) * 100);
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    blue: "bg-blue-500",
    purple: "bg-purple-500",
  };
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Probability</span>
        <span className="font-semibold text-gray-800">{pct}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function EligibilityBadge({ eligible }) {
  return eligible ? (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
      <CheckCircle className="w-4 h-4" />
      Eligible
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
      <XCircle className="w-4 h-4" />
      Not Eligible
    </span>
  );
}

function EarlyReleaseCard({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-blue-600 px-5 py-3 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold">Early Release</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <EligibilityBadge eligible={data.eligible} />
          {data.months_until_eligible != null && (
            <span className="text-sm text-gray-500">
              {data.months_until_eligible === 0
                ? "Eligible now"
                : `${data.months_until_eligible} months away`}
            </span>
          )}
        </div>

        <ProbabilityBar value={data.probability} color="blue" />

        {data.predicted_release_date && (
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-500 mb-1">Predicted Release Date</p>
            <p className="text-base font-bold text-blue-800">
              {new Date(data.predicted_release_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}

        {data.key_conditions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Key Conditions
            </p>
            <ul className="space-y-1">
              {data.key_conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.blocking_factors?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
              Blocking Factors
            </p>
            <ul className="space-y-1">
              {data.blocking_factors.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PardonCard({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-yellow-500 px-5 py-3 flex items-center gap-3">
        <Award className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold">Presidential Pardon</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <EligibilityBadge eligible={data.eligible} />
        </div>

        <ProbabilityBar value={data.probability} color="yellow" />

        {data.criteria_met?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
              Criteria Met
            </p>
            <ul className="space-y-1">
              {data.criteria_met.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-green-700">
                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.criteria_not_met?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
              Criteria Not Met
            </p>
            <ul className="space-y-1">
              {data.criteria_not_met.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                  <XCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.recommendation && (
          <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-800 italic">
            {data.recommendation}
          </div>
        )}
      </div>
    </div>
  );
}

function HomeLeaveCard({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-emerald-600 px-5 py-3 flex items-center gap-3">
        <Home className="w-5 h-5 text-white" />
        <h3 className="text-white font-semibold">Home Leave</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-center">
          <EligibilityBadge eligible={data.eligible} />
          {data.recommended_duration_days && (
            <span className="text-sm font-bold text-emerald-700">
              {data.recommended_duration_days} days
            </span>
          )}
        </div>

        <ProbabilityBar value={data.probability} color="green" />

        {data.conditions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Conditions
            </p>
            <ul className="space-y-1">
              {data.conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.risk_mitigations?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              Risk Mitigations
            </p>
            <ul className="space-y-1">
              {data.risk_mitigations.map((r, i) => (
                <li key={i} className="text-xs text-blue-700">• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RehabPredictions() {
  const [inmates, setInmates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    InmateService.getAllInmates().then(setInmates).catch(console.error);
  }, []);

  const handleGenerate = async () => {
    if (!selectedId) return;
    try {
      setLoading(true);
      setResult(null);
      setError(null);
      const data = await BackendRehabService.getAutoPredictions(selectedId);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.status === 404
          ? "No rehabilitation profile found for this inmate. Create a profile first via Eligibility Assessment."
          : "Failed to generate predictions. Ensure all backend services are running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => (window.location.href = "/rehabilitation")}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post-Rehab Predictions</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            AI predictions auto-generated from rehabilitation progress data
          </p>
        </div>
      </div>

      {/* Inmate selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Select Inmate</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Inmate</label>
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setResult(null); setError(null); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- Select Inmate --</option>
              {inmates.map((inmate) => (
                <option key={inmate.id} value={inmate.id?.toString()}>
                  {inmate.id} — {inmate.firstName} {inmate.lastName}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleGenerate}
            disabled={!selectedId || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? "Generating…" : "Generate Predictions"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Predictions are automatically computed from saved rehabilitation data — no manual entry needed.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Overall readiness */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-200 text-sm">Overall Readiness Score</p>
                <p className="text-4xl font-bold mt-1">
                  {Math.round((result.overall_readiness_score ?? result.overallReadinessScore ?? 0) * 100)}%
                </p>
              </div>
              <div className="text-right">
                <Star className="w-10 h-10 text-yellow-300 ml-auto mb-2" />
                {result.priority_recommendation && (
                  <p className="text-sm text-purple-100 max-w-xs text-right">
                    {result.priority_recommendation}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Prediction cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {result.early_release && <EarlyReleaseCard data={result.early_release} />}
            {result.presidential_pardon && <PardonCard data={result.presidential_pardon} />}
            {result.home_leave && <HomeLeaveCard data={result.home_leave} />}
          </div>
        </div>
      )}

      {/* Idle state */}
      {!result && !error && !loading && (
        <div className="text-center py-16 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Select an inmate and click Generate Predictions to see AI-driven release predictions.
        </div>
      )}
    </div>
  );
}
