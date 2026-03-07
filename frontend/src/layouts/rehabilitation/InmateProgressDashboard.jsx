import React, { useState, useEffect } from "react";
import BackendRehabService from "../../services/rehab/backendRehabService";
import InmateService from "../../services/inmate/inmateService";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  TrendingUp,
  Brain,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  Shield,
  Users,
  BarChart2,
  RefreshCw,
  Calendar,
  Award,
  Home,
} from "lucide-react";

/* ─── helpers ───────────────────────────────────────────────────────────────── */

const ScoreRing = ({ value = 0, label, color = "#3b82f6", size = 100 }) => {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={50}
          y={54}
          textAnchor="middle"
          fontSize={17}
          fontWeight="700"
          fill={color}
        >
          {Math.round(value)}
        </text>
      </svg>
      <span className="text-xs text-gray-500 text-center">{label}</span>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color = "blue", sub }) => {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-0.5 opacity-70">{sub}</div>}
    </div>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
};

/* ─── main component ────────────────────────────────────────────────────────── */

export default function InmateProgressDashboard({ inmateId: propId }) {
  const [inmateId, setInmateId] = useState(propId || "");
  const [inputId, setInputId] = useState(propId || "");
  const [inmates, setInmates] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async (id = inmateId) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const summary = await BackendRehabService.getProgressSummary(id.trim());
      setData(summary);
      setInmateId(id.trim());
    } catch (err) {
      console.error(err);
      setError("Failed to load progress data. Make sure this inmate has a rehabilitation profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    InmateService.getAllInmates().then(setInmates).catch(console.error);
  }, []);

  useEffect(() => {
    if (propId) load(propId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propId]);

  /* radar data */
  const radarData = data
    ? [
        { dimension: "Behavior", score: data.behaviorScore ?? 0 },
        { dimension: "Counseling", score: data.counselingScore ?? 0 },
        { dimension: "Program", score: data.programProgressScore ?? 0 },
        { dimension: "Eligibility", score: data.eligibilityScore ?? 0 },
        { dimension: "Safety", score: data.riskScore ?? 0 },
      ]
    : [];

  /* formatted trend series */
  const progressTrend = (data?.progressTrend ?? []).map((p) => ({
    ...p,
    date: formatDate(p.date),
  }));
  const counselingTrend = (data?.counselingTrend ?? []).map((p) => ({
    ...p,
    date: formatDate(p.date),
  }));
  const eligibilityTrend = (data?.eligibilityTrend ?? []).map((p) => ({
    ...p,
    date: formatDate(p.date),
  }));

  return (
    <div className="space-y-6">
      {/* ── search bar (only when not embedded with propId) ── */}
      {!propId && (
        <div className="flex gap-2">
          <select
            value={inputId}
            onChange={(e) => {
              setInputId(e.target.value);
              if (e.target.value) load(e.target.value);
            }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Inmate --</option>
            {inmates.map((inmate) => (
              <option key={inmate.id} value={inmate.id?.toString()}>
                {inmate.id} — {inmate.firstName} {inmate.lastName}
              </option>
            ))}
          </select>
          <button
            onClick={() => load(inputId)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
            Load
          </button>
          {data && (
            <button
              onClick={() => load()}
              className="p-2 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ── loading / error ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
          <p className="text-gray-500 text-sm">Loading rehabilitation dashboard…</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── dashboard content ── */}
      {data && !loading && (
        <>
          {/* Row 1 – header + overall score */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white">
            <div>
              <h2 className="text-xl font-bold">Rehabilitation Progress</h2>
              <p className="text-blue-200 text-sm mt-0.5">Inmate #{inmateId}</p>
              <div className="mt-3 flex items-center gap-2">
                {data.currentlyEligible ? (
                  <span className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <CheckCircle className="w-3.5 h-3.5" /> Eligible for Rehabilitation
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Not Currently Eligible
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-5xl font-extrabold">{Math.round(data.overallProgressScore ?? 0)}</div>
              <div className="text-blue-200 text-sm mt-1">Overall Score / 100</div>
              <div className="w-48 h-2 bg-blue-900/40 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, data.overallProgressScore ?? 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Row 2 – stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={Activity} label="Counseling Sessions" value={data.totalCounselingSessions ?? 0} color="purple" />
            <StatCard icon={TrendingUp} label="Progress Logs" value={data.totalProgressLogs ?? 0} color="blue" />
            <StatCard icon={Brain} label="Assessments" value={data.totalEligibilityAssessments ?? 0} color="amber" />
            <StatCard icon={CheckCircle} label="Programs Done" value={data.programsCompleted ?? 0} color="green" />
            <StatCard
              icon={Shield}
              label="Eligibility Score"
              value={`${Math.round(data.eligibilityScore ?? 0)}%`}
              color={data.currentlyEligible ? "green" : "red"}
            />
          </div>

          {/* Row 3 – radar + dimension rings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">5-Dimension Assessment</h3>
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.25}
                  />
                  <Tooltip formatter={(v) => [`${Math.round(v)}`, "Score"]} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Dimension rings */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-3 gap-4 place-items-center">
                <ScoreRing value={data.behaviorScore ?? 0} label="Behavior" color="#8b5cf6" />
                <ScoreRing value={data.counselingScore ?? 0} label="Counseling" color="#06b6d4" />
                <ScoreRing value={data.programProgressScore ?? 0} label="Program" color="#10b981" />
                <ScoreRing value={data.eligibilityScore ?? 0} label="Eligibility" color="#3b82f6" />
                <ScoreRing value={data.riskScore ?? 0} label="Safety" color="#f59e0b" />
              </div>
            </div>
          </div>

          {/* Row 4 – progress trend */}
          {progressTrend.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" /> Program Progress Over Time
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={progressTrend}>
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Progress"]} />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#progGrad)"
                    dot={{ r: 4, fill: "#10b981" }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Row 5 – counseling + eligibility side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {counselingTrend.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" /> Counseling Session Scores
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={counselingTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}`, "Score"]} />
                    <Bar dataKey="score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {eligibilityTrend.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-600" /> Eligibility Score History
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={eligibilityTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Eligibility"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Eligibility %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {counselingTrend.length === 0 && eligibilityTrend.length === 0 && (
              <div className="col-span-2 bg-gray-50 rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400 text-sm">
                No trend data yet. Add counseling sessions and run eligibility assessments to see charts.
              </div>
            )}
          </div>

          {/* Row 6 – AI reasoning panel */}
          {data.latestReasonExplainer && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-600" /> Latest AI Assessment Reasoning
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                {data.latestReasonExplainer}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.latestStrengths?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5" /> Strengths
                    </p>
                    <ul className="space-y-1">
                      {data.latestStrengths.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-green-700">
                          <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.latestRiskFactors?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Risk Factors
                    </p>
                    <ul className="space-y-1">
                      {data.latestRiskFactors.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-sm text-red-700">
                          <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {data.latestRecommendedPrograms?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                    Recommended Programs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.latestRecommendedPrograms.map((p, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium"
                      >
                        {p.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Row 7 – Auto-generated predictions */}
          {data.predictions && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-600" /> Release Predictions
              </h3>

              {/* Overall readiness banner */}
              {(data.predictions.overall_readiness_score ?? data.predictions.overallReadinessScore) != null && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white flex items-center justify-between">
                  <div>
                    <p className="text-purple-200 text-xs">Overall Readiness Score</p>
                    <p className="text-3xl font-bold mt-0.5">
                      {Math.round((data.predictions.overall_readiness_score ?? data.predictions.overallReadinessScore) * 100)}%
                    </p>
                  </div>
                  {data.predictions.priority_recommendation && (
                    <p className="text-sm text-purple-100 max-w-xs text-right">
                      {data.predictions.priority_recommendation}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Early Release mini-card */}
                {data.predictions.early_release && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-blue-600 px-4 py-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-white" />
                      <h4 className="text-white font-semibold text-sm">Early Release</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        {data.predictions.early_release.eligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Not Eligible
                          </span>
                        )}
                        {data.predictions.early_release.months_until_eligible != null && (
                          <span className="text-xs text-gray-500">
                            {data.predictions.early_release.months_until_eligible === 0
                              ? "Eligible now"
                              : `${data.predictions.early_release.months_until_eligible}m away`}
                          </span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Probability</span>
                          <span className="font-semibold text-gray-800">
                            {Math.round((data.predictions.early_release.probability ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{ width: `${Math.round((data.predictions.early_release.probability ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {data.predictions.early_release.predicted_release_date && (
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-blue-500 mb-0.5">Predicted Release</p>
                          <p className="text-sm font-bold text-blue-800">
                            {new Date(data.predictions.early_release.predicted_release_date).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Presidential Pardon mini-card */}
                {data.predictions.presidential_pardon && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-yellow-500 px-4 py-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-white" />
                      <h4 className="text-white font-semibold text-sm">Presidential Pardon</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {data.predictions.presidential_pardon.eligible ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Not Eligible
                        </span>
                      )}
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Probability</span>
                          <span className="font-semibold text-gray-800">
                            {Math.round((data.predictions.presidential_pardon.probability ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-yellow-500"
                            style={{ width: `${Math.round((data.predictions.presidential_pardon.probability ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                      {data.predictions.presidential_pardon.recommendation && (
                        <p className="text-xs text-yellow-800 italic bg-yellow-50 p-2 rounded">
                          {data.predictions.presidential_pardon.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Home Leave mini-card */}
                {data.predictions.home_leave && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-600 px-4 py-2 flex items-center gap-2">
                      <Home className="w-4 h-4 text-white" />
                      <h4 className="text-white font-semibold text-sm">Home Leave</h4>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        {data.predictions.home_leave.eligible ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Not Eligible
                          </span>
                        )}
                        {data.predictions.home_leave.recommended_duration_days && (
                          <span className="text-xs font-bold text-emerald-700">
                            {data.predictions.home_leave.recommended_duration_days} days
                          </span>
                        )}
                      </div>
                      <div className="w-full">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Probability</span>
                          <span className="font-semibold text-gray-800">
                            {Math.round((data.predictions.home_leave.probability ?? 0) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-emerald-500"
                            style={{ width: `${Math.round((data.predictions.home_leave.probability ?? 0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && !error && !propId && (
        <div className="text-center py-16 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Enter an Inmate ID above to view their rehabilitation progress dashboard.
        </div>
      )}
    </div>
  );
}
