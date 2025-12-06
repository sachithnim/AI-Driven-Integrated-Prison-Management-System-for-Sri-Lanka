package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequest {
    private String inmateId;
    private Map<String, Object> inmateData; // Optional: override DB data
    private boolean forceRegenerate = false;
}
