package com.pms.rehabilitationservice.service;

import com.pms.rehabilitationservice.dto.*;
import com.pms.rehabilitationservice.model.*;
import com.pms.rehabilitationservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class RehabilitationService {
    
    private final RehabProfileRepository profileRepository;
    private final ProgramRepository programRepository;
    private final RecommendationRepository recommendationRepository;
    private final ProgressLogRepository progressLogRepository;
    private final MedicalReportRepository medicalReportRepository;
    private final CounselingNoteRepository counselingNoteRepository;
    
    private final AIServiceClient aiServiceClient;
    private final AssignmentService assignmentService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    
    /**
     * Get rehab profile for an inmate
     */
    public RehabProfile getProfile(String inmateId) {
        return profileRepository.findByInmateId(inmateId)
                .orElseThrow(() -> new RuntimeException("Profile not found for inmate: " + inmateId));
    }
    
    /**
     * Generate AI-powered recommendation for an inmate
     */
    @Transactional
    public RecommendationResponse generateRecommendation(RecommendationRequest request) {
        String inmateId = request.getInmateId();
        log.info("Generating recommendation for inmate: {}", inmateId);
        
        // Get or create rehab profile
        RehabProfile profile = profileRepository.findByInmateId(inmateId)
                .orElseGet(() -> createInitialProfile(inmateId, request.getInmateData()));
        
        // Call AI service for recommendations
        AIRecommendationRequest aiRequest = new AIRecommendationRequest(
                inmateId,
                profile.getProfileFeatures(),
                profile.getSuitabilityGroup(),
                profile.getRiskScore()
        );
        
        AIRecommendationResponse aiResponse = aiServiceClient.getRecommendations(aiRequest);
        
        // Find matching program from catalog
        Program program = findBestProgram(aiResponse);
        if (program == null) {
            throw new RuntimeException("No suitable program found");
        }
        
        // Extract needs for assignment
        List<String> inmateNeeds = extractNeedsFromProfile(profile);
        String inmateZone = extractZoneFromProfile(profile);
        
        // Assign station and officer
        RehabStation station = assignmentService.assignStation(inmateNeeds, inmateZone);
        MedicalOfficer officer = assignmentService.assignOfficer(inmateNeeds, station != null ? station.getId() : null);
        
        if (station == null || officer == null) {
            log.warn("Unable to assign station or officer for inmate: {}", inmateId);
        }
        
        // Create recommendation record
        Recommendation recommendation = new Recommendation();
        recommendation.setInmateId(inmateId);
        recommendation.setProgram(program);
        recommendation.setStation(station);
        recommendation.setOfficer(officer);
        recommendation.setRecommendedDurationWeeks(
                aiResponse.getPrograms().isEmpty() ? 12 : 
                aiResponse.getPrograms().get(0).getDurationWeeks()
        );
        recommendation.setReasonExplainer(aiResponse.getExplanation());
        recommendation.setConfidence(aiResponse.getConfidence());
        recommendation.setStatus(RecommendationStatus.PENDING);
        
        recommendation = recommendationRepository.save(recommendation);
        
        // Publish event
        publishRecommendationEvent(recommendation);
        
        return toRecommendationResponse(recommendation);
    }
    
    /**
     * Add medical report for an inmate
     */
    @Transactional
    public MedicalReport addMedicalReport(String inmateId, Map<String, Object> vitals, 
                                          String diagnosis, String notes, String officerId) {
        MedicalReport report = new MedicalReport();
        report.setInmateId(inmateId);
        report.setOfficerId(officerId);
        report.setVitals(vitals);
        report.setDiagnosis(diagnosis);
        report.setNotes(notes);
        
        report = medicalReportRepository.save(report);
        
        // Trigger profile update
        updateProfileFromMedicalReport(inmateId);
        
        kafkaTemplate.send("medical.report.added", inmateId);
        
        return report;
    }
    
    /**
     * Add counseling note for an inmate
     */
    @Transactional
    public CounselingNote addCounselingNote(String inmateId, String text, 
                                            Double sessionScore, String counselorId) {
        // Analyze with AI
        String analysis = aiServiceClient.analyzeCounselingNotes(inmateId, text);
        
        CounselingNote note = new CounselingNote();
        note.setInmateId(inmateId);
        note.setCounselorId(counselorId);
        note.setText(text);
        note.setSessionScore(sessionScore);
        note.setSummary(analysis);
        
        note = counselingNoteRepository.save(note);
        
        // Trigger profile update
        updateProfileFromCounselingNote(inmateId);
        
        kafkaTemplate.send("counseling.note.added", inmateId);
        
        return note;
    }
    
    /**
     * Log progress for a recommendation
     */
    @Transactional
    public ProgressLog logProgress(Long recommendationId, ProgressStatus status, 
                                   Integer progressPercentage, String notes, String recordedBy) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RuntimeException("Recommendation not found"));
        
        ProgressLog log = new ProgressLog();
        log.setInmateId(recommendation.getInmateId());
        log.setRecommendation(recommendation);
        log.setStatus(status);
        log.setProgressPercentage(progressPercentage);
        log.setNotes(notes);
        log.setRecordedBy(recordedBy);
        
        log = progressLogRepository.save(log);
        
        // Update recommendation status if completed
        if (progressPercentage != null && progressPercentage >= 100) {
            recommendation.setStatus(RecommendationStatus.COMPLETED);
            recommendationRepository.save(recommendation);
        }
        
        kafkaTemplate.send("rehab.progress.updated", recommendation.getInmateId());
        
        return log;
    }
    
    /**
     * Get all programs
     */
    public List<Program> getAllPrograms() {
        return programRepository.findByActiveTrue();
    }
    
    /**
     * Get recommendations for an inmate
     */
    public List<Recommendation> getRecommendations(String inmateId) {
        return recommendationRepository.findByInmateId(inmateId);
    }
    
    // Helper methods
    
    private RehabProfile createInitialProfile(String inmateId, Map<String, Object> data) {
        RehabProfile profile = new RehabProfile();
        profile.setInmateId(inmateId);
        profile.setProfileFeatures(data != null ? data : Map.of());
        profile.setSuitabilityGroup("general");
        profile.setRiskScore(0.5);
        profile.setLastUpdated(LocalDateTime.now());
        return profileRepository.save(profile);
    }
    
    private Program findBestProgram(AIRecommendationResponse aiResponse) {
        if (aiResponse.getPrograms().isEmpty()) return null;
        
        String programType = aiResponse.getPrograms().get(0).getProgramType();
        List<Program> programs = programRepository.findByType(programType);
        
        return programs.isEmpty() ? null : programs.get(0);
    }
    
    private List<String> extractNeedsFromProfile(RehabProfile profile) {
        // Extract from suitability group or features
        String group = profile.getSuitabilityGroup();
        return group != null ? List.of(group) : List.of("general");
    }
    
    private String extractZoneFromProfile(RehabProfile profile) {
        Map<String, Object> features = profile.getProfileFeatures();
        return features != null && features.containsKey("zone") ? 
                features.get("zone").toString() : "general";
    }
    
    private void updateProfileFromMedicalReport(String inmateId) {
        // Logic to update profile based on new medical data
        log.info("Profile update triggered for inmate: {} from medical report", inmateId);
    }
    
    private void updateProfileFromCounselingNote(String inmateId) {
        // Logic to update profile based on new counseling data
        log.info("Profile update triggered for inmate: {} from counseling note", inmateId);
    }
    
    private void publishRecommendationEvent(Recommendation recommendation) {
        kafkaTemplate.send("rehab.recommendation.created", recommendation.getInmateId());
    }
    
    private RecommendationResponse toRecommendationResponse(Recommendation rec) {
        return RecommendationResponse.builder()
                .recommendationId(rec.getId())
                .inmateId(rec.getInmateId())
                .program(toProgramDTO(rec.getProgram()))
                .station(toStationDTO(rec.getStation()))
                .officer(toOfficerDTO(rec.getOfficer()))
                .durationWeeks(rec.getRecommendedDurationWeeks())
                .explanation(rec.getReasonExplainer())
                .confidence(rec.getConfidence())
                .status(rec.getStatus().toString())
                .build();
    }
    
    private ProgramDTO toProgramDTO(Program p) {
        if (p == null) return null;
        return new ProgramDTO(p.getId(), p.getName(), p.getType(), p.getDurationWeeks(),
                p.getRequiredSkills(), p.getCapacity(), p.getCurrentEnrollment(), p.getDescription());
    }
    
    private StationDTO toStationDTO(RehabStation s) {
        if (s == null) return null;
        return new StationDTO(s.getId(), s.getName(), s.getLocation(), s.getZone(),
                s.getCapacity(), s.getCurrentLoad(), s.getSpecializations(), s.getSuccessRate());
    }
    
    private OfficerDTO toOfficerDTO(MedicalOfficer o) {
        if (o == null) return null;
        return new OfficerDTO(o.getId(), o.getOfficerId(), o.getName(), o.getSpecializations(),
                o.getAssignedStationId(), o.getCurrentLoad(), o.getMaxCapacity(), o.getSuccessRate());
    }
}
