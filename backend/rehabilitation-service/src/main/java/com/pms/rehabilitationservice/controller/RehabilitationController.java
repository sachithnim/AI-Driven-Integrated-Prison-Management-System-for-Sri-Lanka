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
import java.util.Set;

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

    @GetMapping("/profiles")
    @Operation(summary = "Get all rehabilitation profiles")
    public ResponseEntity<List<RehabProfile>> getAllProfiles() {
        return ResponseEntity.ok(rehabilitationService.getAllProfiles());
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

    @GetMapping("/medical-reports/{inmateId}")
    @Operation(summary = "Get all medical reports for an inmate")
    public ResponseEntity<List<MedicalReport>> getMedicalReports(@PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getMedicalReports(inmateId));
    }

    @GetMapping("/counseling-notes/{inmateId}")
    @Operation(summary = "Get all counseling notes for an inmate")
    public ResponseEntity<List<CounselingNote>> getCounselingNotes(@PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getCounselingNotes(inmateId));
    }

    @GetMapping("/progress-logs/{inmateId}")
    @Operation(summary = "Get all progress logs for an inmate")
    public ResponseEntity<List<ProgressLog>> getProgressLogs(@PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getProgressLogs(inmateId));
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

    // ── Dynamic Eligibility Assessment ──────────────────────────────────────────

    @GetMapping("/eligibility/factors")
    @Operation(summary = "Get all available eligibility factors for dynamic assessment")
    public ResponseEntity<Map<String, Object>> getEligibilityFactors() {
        return ResponseEntity.ok(rehabilitationService.getAvailableFactors());
    }

    @PostMapping("/eligibility/suggest-factors")
    @Operation(summary = "AI-suggest factor values from inmate registration data")
    public ResponseEntity<Map<String, Object>> suggestFactorValues(
            @RequestBody Map<String, Object> inmateData) {
        return ResponseEntity.ok(rehabilitationService.suggestFactorValues(inmateData));
    }

    @PostMapping("/eligibility/assess")
    @Operation(summary = "Run dynamic eligibility assessment with selected factors")
    public ResponseEntity<DynamicEligibilityResponse> assessEligibility(
            @RequestBody DynamicEligibilityRequest request) {
        return ResponseEntity.ok(rehabilitationService.assessDynamicEligibility(request));
    }

    // ── Post-Rehab Predictions ───────────────────────────────────────────────────

    @PostMapping("/predict/all")
    @Operation(summary = "Run all post-rehab predictions (early release, pardon, home leave)")
    public ResponseEntity<AggregatedPredictionsResponse> getAllPredictions(
            @RequestBody PostRehabPredictionRequest request) {
        return ResponseEntity.ok(rehabilitationService.getAllPredictions(request));
    }

    // ── Enhanced Counseling (with AI sentiment analysis) ────────────────────────

    @PostMapping("/counseling-note/analyze")
    @Operation(summary = "Add counseling note and get AI sentiment analysis")
    public ResponseEntity<Map<String, Object>> addCounselingNoteWithAnalysis(
            @RequestBody Map<String, Object> request) {
        String inmateId    = (String) request.get("inmateId");
        String text        = (String) request.get("text");
        String counselorId = (String) request.get("counselorId");
        String sessionType = (String) request.get("sessionType");
        Double sessionScore = request.containsKey("sessionScore")
                ? ((Number) request.get("sessionScore")).doubleValue() : null;

        return ResponseEntity.ok(rehabilitationService.addCounselingNoteWithAnalysis(
                inmateId, text, sessionScore, sessionType, counselorId));
    }

    // ── Progress Dashboard ───────────────────────────────────────────────────────

    @GetMapping("/progress-summary/{inmateId}")
    @Operation(summary = "Get comprehensive rehabilitation progress summary for dashboard charts")
    public ResponseEntity<com.pms.rehabilitationservice.dto.ProgressSummaryDTO> getProgressSummary(
            @PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getProgressSummary(inmateId));
    }

    @GetMapping("/eligibility-history/{inmateId}")
    @Operation(summary = "Get eligibility assessment history for an inmate")
    public ResponseEntity<List<com.pms.rehabilitationservice.model.EligibilityAssessment>> getEligibilityHistory(
            @PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getEligibilityHistory(inmateId));
    }

    // ── Auto Predictions (no manual form needed) ─────────────────────────────────

    @GetMapping("/predictions/auto/{inmateId}")
    @Operation(summary = "Auto-generate post-rehab predictions from stored rehabilitation profile data")
    public ResponseEntity<AggregatedPredictionsResponse> getAutoPredictions(
            @PathVariable String inmateId) {
        return ResponseEntity.ok(rehabilitationService.getAutoPredictions(inmateId));
    }

    @GetMapping("/profiled-ids")
    @Operation(summary = "Get set of inmate IDs that already have a rehabilitation profile (for batch-skip logic)")
    public ResponseEntity<Set<String>> getProfiledInmateIds() {
        return ResponseEntity.ok(rehabilitationService.getProfiledInmateIds());
    }
}
