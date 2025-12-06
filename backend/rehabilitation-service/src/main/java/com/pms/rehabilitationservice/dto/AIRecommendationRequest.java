package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIRecommendationRequest {
    private String inmateId;
    private Map<String, Object> profileFeatures;
    private String suitabilityGroup;
    private Double riskScore;
}
