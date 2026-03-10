package com.pms.rehabilitationservice.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AggregatedPredictionsResponse {
    @JsonProperty("inmate_id")
    private String inmateId;
    @JsonProperty("early_release")
    private EarlyRelease earlyRelease;
    @JsonProperty("presidential_pardon")
    private Pardon presidentialPardon;
    @JsonProperty("home_leave")
    private HomeLeave homeLeave;
    @JsonProperty("overall_readiness_score")
    private double overallReadinessScore;
    @JsonProperty("priority_recommendation")
    private String priorityRecommendation;
    @JsonProperty("generated_at")
    private String generatedAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EarlyRelease {
        private boolean eligible;
        private double probability;
        @JsonProperty("predicted_release_date")
        private String predictedReleaseDate;
        @JsonProperty("months_until_eligible")
        private Integer monthsUntilEligible;
        @JsonProperty("minimum_required_date")
        private String minimumRequiredDate;
        @JsonProperty("key_conditions")
        private List<String> keyConditions;
        @JsonProperty("blocking_factors")
        private List<String> blockingFactors;
        private String reasoning;
        private double confidence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pardon {
        private boolean eligible;
        private double probability;
        @JsonProperty("key_criteria_met")
        private List<String> keyCriteriaMet;
        @JsonProperty("key_criteria_not_met")
        private List<String> keyCriteriaNotMet;
        private String reasoning;
        @JsonProperty("recommended_action")
        private String recommendedAction;
        private double confidence;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HomeLeave {
        private boolean eligible;
        private double probability;
        @JsonProperty("recommended_duration_days")
        private Integer recommendedDurationDays;
        private List<String> conditions;
        @JsonProperty("risk_mitigations")
        private List<String> riskMitigations;
        private String reasoning;
        private double confidence;
    }
}
