package com.pms.rehabilitationservice.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Aggregated rehabilitation progress summary for one inmate.
 * Designed to feed the frontend progress charts directly.
 */
@Data
@Builder
public class ProgressSummaryDTO {

    private String inmateId;

    // Overall composite score 0–100 computed from latest data
    private Double overallProgressScore;

    // Breakdown scores (0–100)
    private Double behaviorScore;
    private Double counselingScore;       // avg of session scores
    private Double programProgressScore; // avg of progress logs percentage
    private Double eligibilityScore;     // latest eligibility score * 100
    private Double riskScore;            // (1 - riskScore) * 100  (inverted for display)
    private Double medicalScore;         // medical compliance score based on reports

    // Trend series for charts
    /** [{date, score}] from progress logs */
    private List<Map<String, Object>> progressTrend;
    /** [{date, score}] from counseling sessions */
    private List<Map<String, Object>> counselingTrend;
    /** [{date, score}] from eligibility assessments */
    private List<Map<String, Object>> eligibilityTrend;
    /** [{date, score}] from medical reports */
    private List<Map<String, Object>> medicalTrend;

    // Counts
    private Integer totalCounselingSessions;
    private Integer totalProgressLogs;
    private Integer totalEligibilityAssessments;
    private Integer totalMedicalReports;
    private Integer programsCompleted;

    // Latest assessment detail
    private Boolean currentlyEligible;
    private String latestReasonExplainer;
    private List<String> latestRiskFactors;
    private List<String> latestStrengths;
    private List<String> latestRecommendedPrograms;

    /**
     * Auto-generated predictions (early release, home leave, presidential pardon).
     * Null if no rehabilitation profile exists or AI service is unavailable.
     */
    private AggregatedPredictionsResponse predictions;
}
