package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIRecommendationRequest {
    private String inmateId;
    private Map<String, Object> profileFeatures;
    private String suitabilityGroup;
    private Double riskScore;

    // ── Extended inmate context for RAG + LLM ────────────────────────
    private Integer age;
    private String gender;
    private String caseType;
    private String crimeDescription;
    private String securityLevel;
    private Integer sentenceLengthMonths;
    private Integer timeServedMonths;
    private Double behaviorScore;
    private Double disciplineScore;
    private List<String> medicalConditions;
    private Boolean hasSubstanceAbuse;
    private Boolean hasMentalHealthIssues;
    private String educationLevel;
    private String occupation;
    private String religion;
    private Integer previousConvictions;
    private Boolean violentHistory;
    private Double familySupport;
    private String addictions;
    private String prisonType;
}
