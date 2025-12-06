package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIRecommendationResponse {
    private List<ProgramRecommendation> programs;
    private String explanation;
    private Double confidence;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProgramRecommendation {
        private String programType;
        private String programName;
        private Integer durationWeeks;
        private Double score;
        private String reason;
    }
}
