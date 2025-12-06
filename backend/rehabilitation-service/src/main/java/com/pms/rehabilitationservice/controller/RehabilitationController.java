package com.pms.rehabilitationservice.controller;

import com.pms.rehabilitationservice.dto.*;
import com.pms.rehabilitationservice.model.*;
import com.pms.rehabilitationservice.service.RehabilitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rehabilitation")
@RequiredArgsConstructor
@Tag(name = "Rehabilitation", description = "Rehabilitation Management APIs")
public class RehabilitationController {
    
    private final RehabilitationService rehabilitationService;
    
    @GetMapping("/profile/{inmateId}")
    @Operation(summary = "Get rehabilitation profile for an inmate")
    public ResponseEntity<RehabProfile> getProfile(@PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getProfile(inmateId));
    }
    
    @PostMapping("/recommend")
    @Operation(summary = "Generate AI-powered rehabilitation recommendation")
    public ResponseEntity<RecommendationResponse> generateRecommendation(
            @RequestBody RecommendationRequest request) {
        return ResponseEntity.ok(rehabilitationService.generateRecommendation(request));
    }
    
    @GetMapping("/recommendations/{inmateId}")
    @Operation(summary = "Get all recommendations for an inmate")
    public ResponseEntity<List<Recommendation>> getRecommendations(@PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getRecommendations(inmateId));
    }
    
    @PostMapping("/medical-report")
    @Operation(summary = "Add medical report for an inmate")
    public ResponseEntity<MedicalReport> addMedicalReport(@RequestBody Map<String, Object> request) {
        String inmateId = (String) request.get("inmateId");
        String officerId = (String) request.get("officerId");
        String diagnosis = (String) request.get("diagnosis");
        String notes = (String) request.get("notes");
        @SuppressWarnings("unchecked")
        Map<String, Object> vitals = (Map<String, Object>) request.get("vitals");
        
        return ResponseEntity.ok(rehabilitationService.addMedicalReport(
                inmateId, vitals, diagnosis, notes, officerId));
    }
    
    @PostMapping("/counseling-note")
    @Operation(summary = "Add counseling note for an inmate")
    public ResponseEntity<CounselingNote> addCounselingNote(@RequestBody Map<String, Object> request) {
        String inmateId = (String) request.get("inmateId");
        String counselorId = (String) request.get("counselorId");
        String text = (String) request.get("text");
        Double sessionScore = request.containsKey("sessionScore") ? 
                ((Number) request.get("sessionScore")).doubleValue() : null;
        
        return ResponseEntity.ok(rehabilitationService.addCounselingNote(
                inmateId, text, sessionScore, counselorId));
    }
    
    @PostMapping("/progress")
    @Operation(summary = "Log progress for a rehabilitation recommendation")
    public ResponseEntity<ProgressLog> logProgress(@RequestBody Map<String, Object> request) {
        Long recommendationId = ((Number) request.get("recommendationId")).longValue();
        String statusStr = (String) request.get("status");
        ProgressStatus status = ProgressStatus.valueOf(statusStr);
        Integer progressPercentage = request.containsKey("progressPercentage") ?
                ((Number) request.get("progressPercentage")).intValue() : null;
        String notes = (String) request.get("notes");
        String recordedBy = (String) request.get("recordedBy");
        
        return ResponseEntity.ok(rehabilitationService.logProgress(
                recommendationId, status, progressPercentage, notes, recordedBy));
    }
    
    @GetMapping("/programs")
    @Operation(summary = "Get all available rehabilitation programs")
    public ResponseEntity<List<Program>> getAllPrograms() {
        return ResponseEntity.ok(rehabilitationService.getAllPrograms());
    }
    
    @GetMapping("/health")
    @Operation(summary = "Health check endpoint")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "rehabilitation-service",
                "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}
