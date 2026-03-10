package com.pms.rehabilitationservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class DynamicEligibilityResponse {
    @JsonProperty("inmate_id")
    private String inmateId;
    private boolean eligible;
    @JsonProperty("eligibility_score")
    private double eligibilityScore;
    private double confidence;
    @JsonProperty("selected_factors")
    private List<String> selectedFactors;
    @JsonProperty("factor_results")
    private List<FactorResult> factorResults;
    @JsonProperty("risk_factors")
    private List<String> riskFactors;
    private List<String> strengths;
    @JsonProperty("recommended_programs")
    private List<String> recommendedPrograms;
    private String reasoning;
    @JsonProperty("assessment_method")
    private String assessmentMethod;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FactorResult {
        private String factor;
        private String label;
        private Object value;
        private double weight;
        private double contribution;
        private String category;
        private String flag;
    }
}
