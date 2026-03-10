package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIRecommendationResponse {
    private List<ProgramRecommendation> programs;
    private StructuredPlan structuredPlan;
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

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StructuredPlan {
        private List<String> shortTermGoals;
        private List<String> longTermGoals;
        private List<Map<String, String>> weeklySchedule;
        private List<Map<String, String>> keyMilestones;
    }
}
