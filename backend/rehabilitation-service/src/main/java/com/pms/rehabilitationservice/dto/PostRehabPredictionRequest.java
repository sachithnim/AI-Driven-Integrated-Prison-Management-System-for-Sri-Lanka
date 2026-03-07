package com.pms.rehabilitationservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostRehabPredictionRequest {
    @JsonProperty("inmate_id") @JsonAlias("inmateId")
    private String inmateId;
    // Sentence
    @JsonProperty("sentence_length_months") @JsonAlias("sentenceLengthMonths")
    private int sentenceLengthMonths;
    @JsonProperty("time_served_months") @JsonAlias("timeServedMonths")
    private int timeServedMonths;
    @JsonProperty("admission_date") @JsonAlias("admissionDate")
    private String admissionDate;
    // Behavior
    @JsonProperty("behavior_score") @JsonAlias("behaviorScore")
    private double behaviorScore;
    @JsonProperty("discipline_score") @JsonAlias("disciplineScore")
    private double disciplineScore;
    @JsonProperty("risk_score") @JsonAlias("riskScore")
    private double riskScore;
    // Programs
    @JsonProperty("programs_completed") @JsonAlias("programsCompleted")
    private int programsCompleted;
    @JsonProperty("total_attendance_rate") @JsonAlias("totalAttendanceRate")
    private double totalAttendanceRate;
    // History
    @JsonProperty("prior_convictions") @JsonAlias("priorConvictions")
    private int priorConvictions;
    @JsonProperty("institutional_violations") @JsonAlias("institutionalViolations")
    private int institutionalViolations;
    // Health
    @JsonProperty("has_substance_abuse") @JsonAlias("hasSubstanceAbuse")
    private boolean hasSubstanceAbuse;
    @JsonProperty("has_mental_health_issues") @JsonAlias("hasMentalHealthIssues")
    private boolean hasMentalHealthIssues;
    // Social
    @JsonProperty("family_support") @JsonAlias("familySupport")
    private double familySupport;
    @JsonProperty("community_ties") @JsonAlias("communityTies")
    private double communityTies;
    @JsonProperty("employment_prospects") @JsonAlias("employmentProspects")
    private double employmentProspects;
    // Crime
    @JsonProperty("crime_severity") @JsonAlias("crimeSeverity")
    private int crimeSeverity;  // 1-5
    @JsonProperty("case_type") @JsonAlias("caseType")
    private String caseType;
    // Rehabilitation
    @JsonProperty("rehab_program_completed") @JsonAlias("rehabProgramCompleted")
    private boolean rehabProgramCompleted;
    @JsonProperty("overall_progress_score") @JsonAlias("overallProgressScore")
    private double overallProgressScore;
    @JsonProperty("counseling_sessions_completed") @JsonAlias("counselingSessionsCompleted")
    private int counselingSessionsCompleted;
    @JsonProperty("avg_counseling_score") @JsonAlias("avgCounselingScore")
    private double avgCounselingScore;
    // Medical
    @JsonProperty("medical_clearance") @JsonAlias("medicalClearance")
    private boolean medicalClearance;
    @JsonProperty("officer_recommendation_score") @JsonAlias("officerRecommendationScore")
    private double officerRecommendationScore;
}
