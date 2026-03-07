package com.pms.rehabilitationservice.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
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
public class DynamicEligibilityRequest {
    @JsonProperty("inmate_id")
    @JsonAlias("inmateId")
    private String inmateId;
    /**
     * Which factors the officer has chosen to assess the inmate against.
     * Example: ["behavior_score", "discipline_score", "risk_score", "programs_completed"]
     */
    @JsonProperty("selected_factors")
    @JsonAlias("selectedFactors")
    private List<String> selectedFactors;
    /**
     * Key-value map of the chosen factor values.
     * Example: {"behavior_score": 75.0, "discipline_score": 68.0}
     */
    @JsonProperty("factor_values")
    @JsonAlias("factorValues")
    private Map<String, Object> factorValues;
    /**
     * Optional: custom weight overrides per factor.
     */
    @JsonProperty("custom_weights")
    @JsonAlias("customWeights")
    private Map<String, Double> customWeights;
    /**
     * Any narrative context to help the AI (optional).
     */
    @JsonProperty("context_notes")
    @JsonAlias("contextNotes")
    private String contextNotes;
}
