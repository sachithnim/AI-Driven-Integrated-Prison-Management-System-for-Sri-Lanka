import React, { useState } from "react";
import InmateService from "../../services/inmate/inmateService";
import RehabilitationService from "../../services/rehab/rehabilitationService";
import BackendRehabService from "../../services/rehab/backendRehabService";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  FilePlus,
  View,
} from "lucide-react";

const ReasoningDisplay = ({ reasoning }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 150;

  if (!reasoning) return null;

  if (reasoning.length <= maxLength) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 leading-relaxed">
        {reasoning}
      </div>
    );
  }

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

export default function Rehabilitation() {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [eligibleInmates, setEligibleInmates] = useState([]);
  const [error, setError] = useState(null);
  const [creatingProfile, setCreatingProfile] = useState(null);

  const mapInmateToAIRequest = (inmate) => {
    // Ensure medicalConditions is an array before using .some()
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
      programs_completed: 0, // Default
      total_attendance_rate: 0.0, // Default
      prior_convictions: 0, // Default
      institutional_violations: 0, // Default
      total_incidents: inmate.totalIncidents || 0,
      points_deducted: 0, // Default
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

      // 1. Fetch all inmates
      const inmates = await InmateService.getAllInmates();
      console.log(`Fetched ${inmates.length} inmates.`);

      // 2. Filter inmates who have the necessary scores
      const candidates = inmates.filter((inmate) => {
        const hasScores =
          inmate.behaviorScore != null &&
          inmate.disciplineScore != null &&
          inmate.riskScore != null;
        return hasScores;
      });

      console.log(
        `Found ${candidates.length} candidates with required scores.`
      );

      if (candidates.length === 0) {
        setLoading(false);
        return;
      }

      setProcessing(true);

      // 3. Assess eligibility for each candidate
      const assessments = await Promise.allSettled(
        candidates.map(async (inmate) => {
          try {
            const aiRequest = mapInmateToAIRequest(inmate);
            const assessment = await RehabilitationService.checkEligibility(
              aiRequest
            );
            return {
              inmate,
              assessment,
            };
          } catch (err) {
            console.error(`Failed to assess inmate ${inmate.id}:`, err);
            return null;
          }
        })
      );

      // 4. Filter successful assessments
      const processed = assessments
        .filter(
          (result) => result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value);

      console.log(`Successfully assessed ${processed.length} inmates.`);

      setEligibleInmates(processed);
    } catch (err) {
      console.error("Error in rehabilitation assessment flow:", err);
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

      // Call Java Backend to create profile and get recommendations
      await BackendRehabService.createRehabProfile(
        inmate.id.toString(),
        aiRequest
      );

      alert(
        `Rehabilitation profile created successfully for ${inmate.firstName} ${inmate.lastName}`
      );
    } catch (err) {
      console.error("Failed to create profile:", err);
      alert(
        "Failed to create rehabilitation profile. Please ensure the Rehabilitation Service is running."
      );
    } finally {
      setCreatingProfile(null);
    }
  };

  if (loading && !processing) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">Fetching inmate data...</p>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">
          AI Engine is analyzing profiles...
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Calculating eligibility scores and recommendations
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Assessment Failed
        </h3>
        <p className="text-gray-600 mb-6">{error}</p>
        <button
          onClick={fetchAndAssessInmates}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Assessment
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Rehabilitation Eligibility Assessment
          </h1>
          <p className="text-gray-600 mt-2">
            AI-driven analysis of inmate profiles for rehabilitation program
            suitability.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchAndAssessInmates}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Assessment
          </button>
          <button
            onClick={() =>
              (window.location.href = "/rehabilitation/rehab-inmates")
            }
            className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <View className="w-4 h-4 mr-2" />
            View Inmates
          </button>
        </div>
      </div>

      {eligibleInmates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-gray-500">
            Click "Run Assessment" to analyze eligible inmates.
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
                    <p className="text-sm text-gray-500">
                      {inmate.bookingNumber}
                    </p>
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
                      style={{
                        width: `${assessment.eligibility_score * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-500">Behavior</div>
                    <div className="font-semibold text-gray-900">
                      {inmate.behaviorScore}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-500">Discipline</div>
                    <div className="font-semibold text-gray-900">
                      {inmate.disciplineScore}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="text-gray-500">Risk</div>
                    <div className="font-semibold text-gray-900">
                      {inmate.riskScore}
                    </div>
                  </div>
                </div>

                {assessment.recommended_programs &&
                  assessment.recommended_programs.length > 0 && (
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
  );
}
