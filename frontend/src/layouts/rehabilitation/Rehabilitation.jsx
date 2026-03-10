import React, { useState, useEffect } from "react";
import InmateService from "../../services/inmate/inmateService";
import RehabilitationService from "../../services/rehab/rehabilitationService";
import BackendRehabService from "../../services/rehab/backendRehabService";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FilePlus,
  View,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const FACTOR_CATEGORIES = {
  behavioral: "Behavioral",
  risk: "Risk",
  sentence: "Sentence",
  programs: "Programs",
  history: "History",
  health: "Health",
  social: "Social",
  progress: "Progress",
  assessment: "Assessment",
};

const ReasoningDisplay = ({ reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 150;
  if (!reasoning) return null;
  if (reasoning.length <= maxLength)
    return (
      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 leading-relaxed">
        {reasoning}
      </div>
    );
  return (
    <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 leading-relaxed">
      <span>
        {isExpanded ? reasoning : `${reasoning.substring(0, maxLength)}...`}
      </span>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-1 text-blue-600 hover:text-blue-800 font-medium hover:underline focus:outline-none"
      >
        {isExpanded ? "Show Less" : "Read More"}
      </button>
    </div>
  );
};

const FactorSelector = ({ factors, selected, values, onChange, onValueChange }) => {
  const [openCategory, setOpenCategory] = useState(null);

  if (!factors) return null;

  const grouped = {};
  Object.entries(factors).forEach(([key, meta]) => {
    const cat = meta.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ key, ...meta });
  });

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex justify-between items-center px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
          >
            <span>{FACTOR_CATEGORIES[cat] || cat}</span>
            {openCategory === cat ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {openCategory === cat && (
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map(({ key, label, default: def }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-white border border-gray-100 rounded-lg p-2"
                >
                  <input
                    type="checkbox"
                    id={`factor-${key}`}
                    checked={selected.includes(key)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...selected, key]
                          : selected.filter((k) => k !== key)
                      )
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <label
                    htmlFor={`factor-${key}`}
                    className="flex-1 text-xs text-gray-700 cursor-pointer"
                  >
                    {label}
                  </label>
                  {selected.includes(key) && (() => {
                    // Determine appropriate range from the factor's default value
                    const isBool = typeof def === "boolean";
                    const isLargeInt = typeof def === "number" && def >= 1 && Number.isInteger(def);
                    const isScore100 = ["behavior_score", "discipline_score", "performance_score"].includes(key);
                    const isMonths = key.includes("month");
                    const maxVal = isScore100 ? 100 : isMonths ? 600 : isLargeInt ? Math.max(def * 10, 20) : 1;
                    const stepVal = (isScore100 || isMonths || isLargeInt) ? 1 : 0.01;
                    if (isBool) return (
                      <input
                        type="checkbox"
                        checked={Boolean(values[key] ?? def)}
                        onChange={(e) => onValueChange(key, e.target.checked)}
                        className="w-4 h-4 text-blue-600 ml-auto"
                      />
                    );
                    return (
                      <input
                        type="number"
                        min={0}
                        max={maxVal}
                        step={stepVal}
                        value={values[key] ?? def ?? ""}
                        onChange={(e) => onValueChange(key, parseFloat(e.target.value))}
                        className="w-20 border border-gray-300 rounded px-2 py-0.5 text-xs text-right"
                        placeholder={String(def ?? "")}
                      />
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default function Rehabilitation() {
  /* ── Legacy assessment state ─────────────────────────────────────── */
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [eligibleInmates, setEligibleInmates] = useState([]);
  const [error, setError] = useState(null);
  const [creatingProfile, setCreatingProfile] = useState(null);

  /* ── Dynamic eligibility state ───────────────────────────────────── */
  const [availableFactors, setAvailableFactors] = useState(null);
  const [selectedFactors, setSelectedFactors] = useState([]);
  const [factorValues, setFactorValues] = useState({});
  const [dynamicInmateId, setDynamicInmateId] = useState("");
  const [dynamicResult, setDynamicResult] = useState(null);
  const [dynamicLoading, setDynamicLoading] = useState(false);
  const [showFactorPanel, setShowFactorPanel] = useState(true); // always expanded
  const [generatingFactors, setGeneratingFactors] = useState(false);
  const [allInmates, setAllInmates] = useState([]);
  const [skippedCount, setSkippedCount] = useState(0);

  useEffect(() => {
    InmateService.getAllInmates().then(setAllInmates).catch(console.error);
  }, []);

  useEffect(() => {
    BackendRehabService.getEligibilityFactors()
      .then((data) => {
        const factors = data.factors || data;
        setAvailableFactors(factors);
        // Pre-select first 6 factors
        setSelectedFactors(Object.keys(factors).slice(0, 6));
      })
      .catch(console.error);
  }, []);

  /** Build the payload for POST /eligibility/suggest-factors */
  const buildSuggestPayload = (inmate) => {
    const conditions = Array.isArray(inmate.medicalConditions) ? inmate.medicalConditions : [];
    const timeServedMonths = inmate.daysServed ? Math.floor(inmate.daysServed / 30) : 0;
    return {
      inmate_id: String(inmate.id ?? "unknown"),
      behavior_score: inmate.behaviorScore ?? null,
      discipline_score: inmate.disciplineScore ?? null,
      risk_score: inmate.riskScore ?? null,
      time_served_months: timeServedMonths,
      sentence_length_months: inmate.sentenceDurationMonths ?? null,
      total_incidents: inmate.totalIncidents ?? 0,
      has_substance_abuse: conditions.some(c => c && (c.toLowerCase().includes("substance") || c.toLowerCase().includes("drug") || c.toLowerCase().includes("withdrawal"))),
      has_mental_health_issues: conditions.some(c => c && (c.toLowerCase().includes("mental") || c.toLowerCase().includes("depression") || c.toLowerCase().includes("bipolar") || c.toLowerCase().includes("schizophrenia"))),
      requires_medical_attention: conditions.length > 0,
      violent_history: inmate.violentHistory ?? false,
      gang_affiliation: inmate.gangAffiliation ?? false,
      escape_risk: inmate.escapeRisk ?? false,
      suicide_risk: inmate.suicideRisk ?? false,
      age: inmate.age ?? null,
      gender: inmate.gender ?? null,
      case_type: inmate.caseType
        ? (typeof inmate.caseType === "number" ? inmate.caseType : ({
            THEFT: 1, DRUG_POSSESSION: 1, CYBERCRIME: 1, FRAUD: 2, EMBEZZLEMENT: 2,
            BURGLARY: 2, DOMESTIC_VIOLENCE: 2, ASSAULT: 3, ROBBERY: 3, DRUG_TRAFFICKING: 3,
            ARSON: 3, SEXUAL_ASSAULT: 4, RAPE: 4, KIDNAPPING: 4, MANSLAUGHTER: 4,
            MURDER: 5, TERRORISM: 5, HUMAN_TRAFFICKING: 5, OTHER: 2
          }[inmate.caseType] ?? 2))
        : 2,
      security_level: inmate.securityLevel ?? null,
      risk_level: inmate.riskLevel ?? null,
      crime_description: inmate.crimeDescription ?? null,
      medical_conditions: conditions,
      first_name: inmate.firstName ?? null,
      last_name: inmate.lastName ?? null,
    };
  };

  const mapInmateToAIRequest = (inmate) => {
    const conditions = Array.isArray(inmate.medicalConditions)
      ? inmate.medicalConditions
      : [];
    return {
      inmate_id: inmate.id?.toString() || "unknown",
      behavior_score: inmate.behaviorScore,
      discipline_score: inmate.disciplineScore,
      risk_score: inmate.riskScore,
      time_served_months: inmate.daysServed
        ? Math.floor(inmate.daysServed / 30)
        : 0,
      sentence_length_months: inmate.sentenceDurationMonths || 0,
      programs_completed: 0,
      total_attendance_rate: 0.0,
      prior_convictions: 0,
      institutional_violations: 0,
      total_incidents: inmate.totalIncidents || 0,
      points_deducted: 0,
      has_substance_abuse:
        conditions.some(
          (c) =>
            c &&
            (c.toLowerCase().includes("substance") ||
              c.toLowerCase().includes("withdrawal") ||
              c.toLowerCase().includes("drug"))
        ) || false,
      has_mental_health_issues:
        conditions.some(
          (c) =>
            c &&
            (c.toLowerCase().includes("mental") ||
              c.toLowerCase().includes("schizophrenia") ||
              c.toLowerCase().includes("bipolar") ||
              c.toLowerCase().includes("depression"))
        ) || false,
    };
  };

  const fetchAndAssessInmates = async () => {
    try {
      setLoading(true);
      setError(null);
      setEligibleInmates([]);
      // Fetch inmates and already-profiled IDs in parallel to avoid redundant assessments
      const [inmates, profiledIdsRaw] = await Promise.all([
        InmateService.getAllInmates(),
        BackendRehabService.getProfiledIds().catch(() => []),
      ]);
      const profiledSet = new Set(profiledIdsRaw.map(String));
      setSkippedCount(profiledSet.size);
      const candidates = inmates.filter(
        (i) =>
          !profiledSet.has(String(i.id)) && // skip already profiled — saves OpenAI tokens
          i.behaviorScore != null &&
          i.disciplineScore != null &&
          i.riskScore != null
      );
      if (candidates.length === 0) { setLoading(false); return; }
      setProcessing(true);
      const assessments = await Promise.allSettled(
        candidates.map(async (inmate) => {
          try {
            const aiRequest = mapInmateToAIRequest(inmate);
            const assessment = await RehabilitationService.checkEligibility(aiRequest);
            return { inmate, assessment };
          } catch (err) {
            console.error(`Failed to assess inmate ${inmate.id}:`, err);
            return null;
          }
        })
      );
      const processed = assessments
        .filter((r) => r.status === "fulfilled" && r.value !== null)
        .map((r) => r.value);
      setEligibleInmates(processed);
    } catch {
      setError("Failed to load rehabilitation assessments.");
    } finally {
      setLoading(false);
      setProcessing(false);
    }
  };

  const handleCreateProfile = async (inmate) => {
    try {
      setCreatingProfile(inmate.id);
      const aiRequest = mapInmateToAIRequest(inmate);
      await BackendRehabService.createRehabProfile(inmate.id.toString(), aiRequest);
      alert(`Rehabilitation profile created successfully for ${inmate.firstName} ${inmate.lastName}`);
    } catch (err) {
      console.error("Failed to create profile:", err);
      alert("Failed to create rehabilitation profile. Please ensure the Rehabilitation Service is running.");
    } finally {
      setCreatingProfile(null);
    }
  };

  const handleDynamicAssess = async () => {
    if (!dynamicInmateId.trim()) {
      alert("Please enter an Inmate ID");
      return;
    }
    if (selectedFactors.length === 0) {
      alert("Please select at least one factor");
      return;
    }
    try {
      setDynamicLoading(true);
      setDynamicResult(null);
      const payload = {
        inmateId: dynamicInmateId.trim(),
        selectedFactors,
        factorValues: Object.fromEntries(
          selectedFactors
            .filter((k) => factorValues[k] !== undefined)
            .map((k) => [k, factorValues[k]])
        ),
      };
      const result = await BackendRehabService.assessDynamicEligibility(payload);
      setDynamicResult(result);
    } catch (err) {
      console.error("Dynamic assessment failed:", err);
      alert("Dynamic eligibility assessment failed. Ensure backend services are running.");
    } finally {
      setDynamicLoading(false);
    }
  };

  if (loading && !processing)
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Fetching inmate data...</p>
      </div>
    );

  if (processing)
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">AI Engine is analyzing profiles...</p>
        <p className="text-gray-400 text-sm mt-2">
          Calculating eligibility scores and recommendations
        </p>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Assessment Failed</h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={fetchAndAssessInmates}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Assessment
        </button>
      </div>
    );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rehabilitation Eligibility Assessment
          </h1>
          <p className="text-gray-600 mt-1">
            AI-driven analysis of inmate profiles for rehabilitation program suitability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Batch Assessment button — disabled; use dynamic eligibility below
          <button
            onClick={fetchAndAssessInmates}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Run Batch Assessment
          </button>
          {skippedCount > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {skippedCount} already profiled — skipped
            </span>
          )}
          */}
          <button
            onClick={() => (window.location.href = "/rehabilitation/rehab-inmates")}
            className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            <View className="w-4 h-4 mr-2" />
            View Inmates
          </button>
          <button
            onClick={() => (window.location.href = "/rehabilitation/progress")}
            className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Progress Tracker
          </button>
          <button
            onClick={() => (window.location.href = "/rehabilitation/predictions")}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            Predictions
          </button>
        </div>
      </div>

      {/* ── Dynamic Eligibility Panel ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Dynamic Factor-Based Eligibility Assessment
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Select an inmate — AI will auto-generate factor values from their profile
              </p>
            </div>
          </div>
          {generatingFactors && (
            <div className="flex items-center gap-2 text-xs text-purple-600">
              <Sparkles className="w-4 h-4 animate-pulse" />
              AI generating factors…
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inmate ID
                </label>
                <select
                  value={dynamicInmateId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setDynamicInmateId(id);
                    setDynamicResult(null);
                    if (!id) return;
                    // Step 1: Try to load existing profile factor values
                    try {
                      const profile = await BackendRehabService.getProfile(id);
                      if (profile?.factorValues && Object.keys(profile.factorValues).length > 0) {
                        setFactorValues(profile.factorValues);
                        return; // already have saved values
                      }
                    } catch {
                      // No existing profile — fall through to AI generation
                    }
                    // Step 2: Auto-generate factor values via AI from inmate data
                    const inmate = allInmates.find((i) => String(i.id) === String(id));
                    if (!inmate) return;
                    try {
                      setGeneratingFactors(true);
                      const payload = buildSuggestPayload(inmate);
                      const result = await BackendRehabService.suggestFactorValues(payload);
                      if (result?.suggested_factors) {
                        setFactorValues(result.suggested_factors);
                        if (result.suggested_selected_factors?.length > 0) {
                          setSelectedFactors(result.suggested_selected_factors);
                        }
                      }
                    } catch (err) {
                      console.warn("AI factor suggestion failed, using defaults:", err);
                    } finally {
                      setGeneratingFactors(false);
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Inmate --</option>
                  {allInmates.map((inmate) => (
                    <option key={inmate.id} value={inmate.id?.toString()}>
                      {inmate.id} — {inmate.firstName} {inmate.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleDynamicAssess}
                disabled={dynamicLoading}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {dynamicLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Run Assessment
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Selected factors ({selectedFactors.length}) — Enter values (0–1) for each
              </p>
              <FactorSelector
                factors={availableFactors}
                selected={selectedFactors}
                values={factorValues}
                onChange={setSelectedFactors}
                onValueChange={(k, v) => setFactorValues((prev) => ({ ...prev, [k]: v }))}
              />
            </div>

            {/* Dynamic result */}
            {dynamicResult && (
              <div
                className={`rounded-xl border p-5 ${
                  dynamicResult.eligible
                    ? "bg-green-50 border-green-200"
                    : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {dynamicResult.eligible ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className="font-semibold text-gray-900">
                      {dynamicResult.eligible ? "Eligible" : "Not Eligible"}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    Score: {((dynamicResult.eligibility_score ?? dynamicResult.eligibilityScore ?? 0) * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Factor breakdown */}
                {dynamicResult.factor_results?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                    {dynamicResult.factor_results.slice(0, 9).map((f) => (
                      <div
                        key={f.factor_key}
                        className={`rounded-lg p-2 text-xs ${
                          f.flag === "positive"
                            ? "bg-green-100 text-green-800"
                            : f.flag === "negative"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        <div className="font-medium truncate">{f.label}</div>
                        <div className="text-gray-500">
                          {(f.contribution * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {dynamicResult.recommended_programs?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {dynamicResult.recommended_programs.map((p, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs"
                      >
                        {p.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                <ReasoningDisplay reasoning={dynamicResult.reasoning} />

                {dynamicResult.eligible && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <button
                      onClick={() => handleCreateProfile(
                        allInmates.find((i) => String(i.id) === String(dynamicInmateId)) || { id: dynamicInmateId }
                      )}
                      disabled={String(creatingProfile) === String(dynamicInmateId)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {String(creatingProfile) === String(dynamicInmateId) ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />Creating Profile…</>
                      ) : (
                        <><FilePlus className="w-4 h-4" />Create Rehab Profile</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* ── Batch Assessment Results (commented out — use Dynamic Eligibility above) ─
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Batch Assessment Results
        </h2>
        {eligibleInmates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-500">
              Click "Run Batch Assessment" to analyze all eligible inmates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {eligibleInmates.map(({ inmate, assessment }) => (
              <div
                key={inmate.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="p-5 border-b border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {inmate.firstName} {inmate.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{inmate.bookingNumber}</p>
                    </div>
                    {assessment.eligible ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Eligible
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <XCircle className="w-3 h-3 mr-1" />
                        Not Eligible
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4 flex-grow">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Eligibility Score</span>
                      <span className="font-medium text-gray-900">
                        {(assessment.eligibility_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          assessment.eligible ? "bg-green-500" : "bg-yellow-500"
                        }`}
                        style={{ width: `${assessment.eligibility_score * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Behavior</div>
                      <div className="font-semibold text-gray-900">{inmate.behaviorScore}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Discipline</div>
                      <div className="font-semibold text-gray-900">{inmate.disciplineScore}</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-gray-500">Risk</div>
                      <div className="font-semibold text-gray-900">{inmate.riskScore}</div>
                    </div>
                  </div>

                  {assessment.recommended_programs?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Recommended Programs
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {assessment.recommended_programs.map((program, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            {program.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <ReasoningDisplay reasoning={assessment.reasoning} />
                </div>

                {assessment.eligible && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => handleCreateProfile(inmate)}
                      disabled={creatingProfile === inmate.id}
                      className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creatingProfile === inmate.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Profile...
                        </>
                      ) : (
                        <>
                          <FilePlus className="w-4 h-4 mr-2" />
                          Create Rehab Profile
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      ── End Batch Assessment Results ─── */}
    </div>
  );
}

