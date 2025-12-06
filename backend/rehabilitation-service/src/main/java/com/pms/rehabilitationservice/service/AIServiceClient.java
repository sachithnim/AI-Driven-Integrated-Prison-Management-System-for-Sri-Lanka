package com.pms.rehabilitationservice.service;

import com.pms.rehabilitationservice.dto.AIRecommendationRequest;
import com.pms.rehabilitationservice.dto.AIRecommendationResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * Client service to communicate with Python FastAPI AI Service
 */
@Service
@Slf4j
public class AIServiceClient {
    
    private final RestTemplate restTemplate;
    private final String aiServiceUrl;
    
    public AIServiceClient(RestTemplate restTemplate, 
                          @Value("${ai.service.url}") String aiServiceUrl) {
        this.restTemplate = restTemplate;
        this.aiServiceUrl = aiServiceUrl;
    }
    
    /**
     * Get AI-powered program recommendations
     */
    public AIRecommendationResponse getRecommendations(AIRecommendationRequest request) {
        try {
            String url = aiServiceUrl + "/api/v1/recommend";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<AIRecommendationRequest> entity = new HttpEntity<>(request, headers);
            
            log.info("Calling AI service for inmate: {}", request.getInmateId());
            
            return restTemplate.postForObject(url, entity, AIRecommendationResponse.class);
            
        } catch (Exception e) {
            log.error("Error calling AI service: {}", e.getMessage(), e);
            // Fallback to rule-based recommendation
            return getFallbackRecommendation(request);
        }
    }
    
    /**
     * Analyze counseling notes using AI (sentiment, summarization)
     */
    public String analyzeCounselingNotes(String inmateId, String text) {
        try {
            String url = aiServiceUrl + "/api/v1/analyze-notes";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            java.util.Map<String, String> requestBody = new java.util.HashMap<>();
            requestBody.put("inmateId", inmateId);
            requestBody.put("text", text);
            
            HttpEntity<java.util.Map<String, String>> entity = new HttpEntity<>(requestBody, headers);
            
            var response = restTemplate.postForObject(url, entity, Object.class);
            return response != null ? response.toString() : "Unable to analyze";
            
        } catch (Exception e) {
            log.error("Error analyzing counseling notes: {}", e.getMessage());
            return "Analysis unavailable";
        }
    }
    
    /**
     * Calculate early release score
     */
    public Double calculateEarlyReleaseScore(String inmateId) {
        try {
            String url = aiServiceUrl + "/api/v1/early-release-score/" + inmateId;
            return restTemplate.getForObject(url, Double.class);
        } catch (Exception e) {
            log.error("Error calculating early release score: {}", e.getMessage());
            return 0.0;
        }
    }
    
    /**
     * Fallback rule-based recommendation when AI service is unavailable
     */
    private AIRecommendationResponse getFallbackRecommendation(AIRecommendationRequest request) {
        log.warn("Using fallback rule-based recommendation for inmate: {}", request.getInmateId());
        
        AIRecommendationResponse response = new AIRecommendationResponse();
        
        // Simple rule-based logic based on suitability group
        String group = request.getSuitabilityGroup();
        AIRecommendationResponse.ProgramRecommendation program = 
            new AIRecommendationResponse.ProgramRecommendation();
        
        if (group != null && group.contains("substance")) {
            program.setProgramType("substance_abuse");
            program.setProgramName("Drug Rehabilitation Program");
            program.setDurationWeeks(12);
            program.setScore(0.7);
            program.setReason("Recommended based on substance abuse history");
        } else if (group != null && group.contains("mental")) {
            program.setProgramType("mental_health");
            program.setProgramName("Mental Health Support Program");
            program.setDurationWeeks(8);
            program.setScore(0.7);
            program.setReason("Recommended based on mental health assessment");
        } else {
            program.setProgramType("vocational");
            program.setProgramName("Vocational Training");
            program.setDurationWeeks(16);
            program.setScore(0.6);
            program.setReason("Default vocational training recommendation");
        }
        
        response.setPrograms(java.util.List.of(program));
        response.setExplanation("Rule-based recommendation (AI service unavailable)");
        response.setConfidence(0.6);
        
        return response;
    }
}
