package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponse {
    private Long recommendationId;
    private String inmateId;
    private ProgramDTO program;
    private StationDTO station;
    private OfficerDTO officer;
    private Integer durationWeeks;
    private String explanation;
    private Double confidence;
    private String status;
}
