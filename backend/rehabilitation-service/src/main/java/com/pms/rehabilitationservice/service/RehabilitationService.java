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
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

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
    private final EligibilityAssessmentRepository eligibilityAssessmentRepository;
    
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
     * Get all rehab profiles
     */
    public List<RehabProfile> getAllProfiles() {
        return profileRepository.findAll();
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
        
        // Find matching program from catalog (auto-creates a default if none exist)
        Program program = findBestProgram(aiResponse);
        
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
        
        sendKafkaSafely("medical.report.added", inmateId);
        
        return report;
    }
    
    /**
     * Add counseling note for an inmate. Updates profile running averages.
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
        
        // Update profile stats and factor values
        updateProfileFromCounselingNote(inmateId);
        if (sessionScore != null) {
            updateFactorValuesFromCounselingScore(inmateId, sessionScore, null);
        }
        
        sendKafkaSafely("counseling.note.added", inmateId);
        
        return note;
    }
    
    /**
     * Log progress for a recommendation. Updates profile stats.
     */
    @Transactional
    public ProgressLog logProgress(Long recommendationId, ProgressStatus status, 
                                   Integer progressPercentage, String notes, String recordedBy) {
        Recommendation recommendation = recommendationRepository.findById(recommendationId)
                .orElseThrow(() -> new RuntimeException("Recommendation not found"));
        
        ProgressLog progressLog = new ProgressLog();
        progressLog.setInmateId(recommendation.getInmateId());
        progressLog.setRecommendation(recommendation);
        progressLog.setStatus(status);
        progressLog.setProgressPercentage(progressPercentage);
        progressLog.setNotes(notes);
        progressLog.setRecordedBy(recordedBy);
        
        progressLog = progressLogRepository.save(progressLog);
        
        // Update recommendation status if completed
        if (progressPercentage != null && progressPercentage >= 100) {
            recommendation.setStatus(RecommendationStatus.COMPLETED);
            recommendationRepository.save(recommendation);
        }

        // Update profile progress stats and factor values
        updateProfileFromProgressLog(recommendation.getInmateId(), progressPercentage);
        updateFactorValuesFromProgress(recommendation.getInmateId(), progressPercentage);
        
        sendKafkaSafely("rehab.progress.updated", recommendation.getInmateId());
        
        return progressLog;
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

    /**
     * Get medical reports for an inmate
     */
    public List<MedicalReport> getMedicalReports(String inmateId) {
        return medicalReportRepository.findByInmateId(inmateId);
    }

    /**
     * Get counseling notes for an inmate
     */
    public List<CounselingNote> getCounselingNotes(String inmateId) {
        return counselingNoteRepository.findByInmateId(inmateId);
    }

    /**
     * Get progress logs for an inmate
     */
    public List<ProgressLog> getProgressLogs(String inmateId) {
        return progressLogRepository.findByInmateId(inmateId);
    }
    
    /**
     * Dynamic eligibility assessment with user-selected factors. Persists the result.
     */
    @Transactional
    public DynamicEligibilityResponse assessDynamicEligibility(DynamicEligibilityRequest request) {
        log.info("Running dynamic eligibility for inmate: {} with factors: {}",
                request.getInmateId(), request.getSelectedFactors());
        DynamicEligibilityResponse response = aiServiceClient.assessDynamicEligibility(request);
        if (response == null) {
            throw new RuntimeException("AI eligibility service returned no response");
        }

        // Persist the assessment result
        try {
            EligibilityAssessment assessment = new EligibilityAssessment();
            assessment.setInmateId(request.getInmateId());
            assessment.setAssessmentType("dynamic");
            assessment.setEligible(response.isEligible());
            assessment.setEligibilityScore(response.getEligibilityScore());
            assessment.setConfidence(response.getConfidence());
            assessment.setReasoning(response.getReasoning());
            assessment.setAssessmentMethod(response.getAssessmentMethod());
            assessment.setSelectedFactors(request.getSelectedFactors());
            assessment.setRecommendedPrograms(response.getRecommendedPrograms());
            assessment.setRiskFactors(response.getRiskFactors());
            assessment.setStrengths(response.getStrengths());
            eligibilityAssessmentRepository.save(assessment);

            // Update profile with latest eligibility score
            updateProfileEligibility(request.getInmateId(), response.getEligibilityScore());
        } catch (Exception e) {
            log.warn("Could not persist eligibility assessment: {}", e.getMessage());
        }

        return response;
    }

    /**
     * Get all available eligibility factors from AI service
     */
    public java.util.Map getAvailableFactors() {
        return aiServiceClient.getAvailableFactors();
    }

    /**
     * Ask AI to suggest pre-filled factor values from raw inmate registration data.
     */
    public java.util.Map suggestFactorValues(java.util.Map<String, Object> inmateData) {
        return aiServiceClient.suggestFactorValues(inmateData);
    }

    /**
     * Run all post-rehab predictions for an inmate (manual payload)
     */
    public AggregatedPredictionsResponse getAllPredictions(PostRehabPredictionRequest request) {
        log.info("Running all post-rehab predictions for inmate: {}", request.getInmateId());
        AggregatedPredictionsResponse response = aiServiceClient.getAllPredictions(request);
        if (response == null) {
            throw new RuntimeException("AI predictions service returned no response");
        }
        return response;
    }

    /**
     * Auto-generate post-rehab predictions by building the full request from stored DB data.
     * No manual form needed — all fields are derived from the rehab profile, counseling notes,
     * progress logs, eligibility assessments, and inmate features.
     */
    public AggregatedPredictionsResponse getAutoPredictions(String inmateId) {
        log.info("Auto-generating post-rehab predictions for inmate: {}", inmateId);
        PostRehabPredictionRequest request = buildAutoPredictionRequest(inmateId);
        AggregatedPredictionsResponse response = aiServiceClient.getAllPredictions(request);
        if (response == null) {
            throw new RuntimeException("AI predictions service returned no response for inmate: " + inmateId);
        }
        return response;
    }

    /**
     * Return the set of inmate IDs that already have a rehabilitation profile.
     * Used by the frontend batch assessment to skip already-profiled inmates.
     */
    public Set<String> getProfiledInmateIds() {
        return new HashSet<>(profileRepository.findAllInmateIds());
    }

    /**
     * Analyze a counseling note with AI and persist it
     */
    @Transactional
    public Map<String, Object> addCounselingNoteWithAnalysis(String inmateId, String text,
                                                              Double sessionScore,
                                                              String sessionType, String counselorId) {
        Map analysis = aiServiceClient.analyzeCounselingNote(inmateId, text, sessionScore, sessionType);

        CounselingNote note = new CounselingNote();
        note.setInmateId(inmateId);
        note.setCounselorId(counselorId);
        note.setText(text);
        note.setSessionScore(sessionScore);
        note.setSummary(analysis != null ? analysis.toString() : null);

        // Persist AI-derived sentiment on the note itself
        if (analysis != null && analysis.get("sentiment") != null) {
            note.setSentiment(analysis.get("sentiment").toString());
        }

        counselingNoteRepository.save(note);

        // Update profile counseling stats
        updateProfileFromCounselingNote(inmateId);

        // Update eligibility factor values based on sentiment + session score
        updateFactorValuesFromCounselingScore(inmateId, sessionScore, analysis);

        sendKafkaSafely("counseling.note.added", inmateId);

        Map<String, Object> result = new java.util.HashMap<>();
        result.put("note", note);
        result.put("analysis", analysis);
        return result;
    }

    /**
     * Get eligibility assessment history for an inmate
     */
    public List<EligibilityAssessment> getEligibilityHistory(String inmateId) {
        return eligibilityAssessmentRepository.findByInmateIdOrderByAssessedAtAsc(inmateId);
    }

    /**
     * Get comprehensive progress summary for the frontend dashboard
     */
    public ProgressSummaryDTO getProgressSummary(String inmateId) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");

        // Fetch all relevant data
        List<CounselingNote> counselingSessions = counselingNoteRepository.findByInmateId(inmateId);
        List<ProgressLog> progressLogs = progressLogRepository.findByInmateId(inmateId);
        List<EligibilityAssessment> eligibilityHistory =
                eligibilityAssessmentRepository.findByInmateIdOrderByAssessedAtAsc(inmateId);
        List<Recommendation> recommendations = recommendationRepository.findByInmateId(inmateId);

        // Profile base scores
        RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
        double behaviorScore = profile != null && profile.getProfileFeatures() != null
                ? toDouble(profile.getProfileFeatures().get("behavior_score"), 50.0) : 50.0;
        double riskRaw = profile != null && profile.getRiskScore() != null ? profile.getRiskScore() : 0.5;

        // Counseling trend
        List<Map<String, Object>> counselingTrend = counselingSessions.stream()
                .filter(c -> c.getSessionScore() != null && c.getSessionDate() != null)
                .sorted(Comparator.comparing(CounselingNote::getSessionDate))
                .map(c -> {
                    Map<String, Object> p = new LinkedHashMap<>();
                    p.put("date", c.getSessionDate().format(fmt));
                    p.put("score", Math.round(c.getSessionScore() * 10.0)); // 0-10 → 0-100
                    return p;
                })
                .collect(Collectors.toList());

        double avgCounseling = counselingSessions.stream()
                .filter(c -> c.getSessionScore() != null)
                .mapToDouble(CounselingNote::getSessionScore)
                .average().orElse(5.0) * 10.0; // scale to 0-100

        // Progress log trend
        List<Map<String, Object>> progressTrend = progressLogs.stream()
                .filter(p -> p.getProgressPercentage() != null && p.getLogDate() != null)
                .sorted(Comparator.comparing(ProgressLog::getLogDate))
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", p.getLogDate().format(fmt));
                    m.put("score", p.getProgressPercentage());
                    return m;
                })
                .collect(Collectors.toList());

        double avgProgramProgress = progressLogs.stream()
                .filter(p -> p.getProgressPercentage() != null)
                .mapToDouble(ProgressLog::getProgressPercentage)
                .average().orElse(0.0);

        // Eligibility trend
        List<Map<String, Object>> eligibilityTrend = eligibilityHistory.stream()
                .filter(e -> e.getEligibilityScore() != null && e.getAssessedAt() != null)
                .map(e -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("date", e.getAssessedAt().format(fmt));
                    m.put("score", Math.round(e.getEligibilityScore() * 100.0));
                    return m;
                })
                .collect(Collectors.toList());

        double latestEligScore = eligibilityHistory.isEmpty() ? 0.0 :
                eligibilityHistory.get(eligibilityHistory.size() - 1).getEligibilityScore() * 100.0;

        // Latest assessment for details panel
        EligibilityAssessment latest = eligibilityHistory.isEmpty() ? null :
                eligibilityHistory.get(eligibilityHistory.size() - 1);

        // Programs completed
        long programsCompleted = recommendations.stream()
                .filter(r -> r.getStatus() == RecommendationStatus.COMPLETED).count();

        // Composite overall score (weighted average of 5 dimensions)
        double overallScore = (behaviorScore * 0.25)
                + (avgCounseling * 0.20)
                + (avgProgramProgress * 0.25)
                + (latestEligScore * 0.20)
                + ((1.0 - riskRaw) * 100.0 * 0.10);

        return ProgressSummaryDTO.builder()
                .inmateId(inmateId)
                .overallProgressScore(Math.min(100.0, Math.round(overallScore * 10.0) / 10.0))
                .behaviorScore(Math.min(100.0, behaviorScore))
                .counselingScore(Math.min(100.0, Math.round(avgCounseling * 10.0) / 10.0))
                .programProgressScore(Math.min(100.0, Math.round(avgProgramProgress * 10.0) / 10.0))
                .eligibilityScore(Math.min(100.0, Math.round(latestEligScore * 10.0) / 10.0))
                .riskScore(Math.min(100.0, Math.round((1.0 - riskRaw) * 100.0 * 10.0) / 10.0))
                .progressTrend(progressTrend)
                .counselingTrend(counselingTrend)
                .eligibilityTrend(eligibilityTrend)
                .totalCounselingSessions(counselingSessions.size())
                .totalProgressLogs(progressLogs.size())
                .totalEligibilityAssessments(eligibilityHistory.size())
                .programsCompleted((int) programsCompleted)
                .currentlyEligible(latest != null && Boolean.TRUE.equals(latest.getEligible()))
                .latestReasonExplainer(latest != null ? latest.getReasoning() : null)
                .latestRiskFactors(latest != null ? latest.getRiskFactors() : List.of())
                .latestStrengths(latest != null ? latest.getStrengths() : List.of())
                .latestRecommendedPrograms(latest != null ? latest.getRecommendedPrograms() : List.of())
                .predictions(tryGetAutoPredictions(inmateId))
                .build();
    }

    /** Attempt to auto-generate predictions; returns null on any error (e.g. no profile). */
    private AggregatedPredictionsResponse tryGetAutoPredictions(String inmateId) {
        try {
            return getAutoPredictions(inmateId);
        } catch (Exception e) {
            log.debug("Auto-predictions skipped for inmate {}: {}", inmateId, e.getMessage());
            return null;
        }
    }

    // ── Helper methods ──────────────────────────────────────────────────────────

    private double toDouble(Object val, double fallback) {
        if (val == null) return fallback;
        try { return Double.parseDouble(val.toString()); } catch (Exception e) { return fallback; }
    }

    private RehabProfile createInitialProfile(String inmateId, Map<String, Object> data) {
        Map<String, Object> features = data != null ? data : Map.of();
        RehabProfile profile = new RehabProfile();
        profile.setInmateId(inmateId);
        profile.setProfileFeatures(features);
        profile.setSuitabilityGroup(detectSuitabilityGroup(features));
        // Use risk_score from inmate data if available (expected 0-1)
        profile.setRiskScore(toDouble(features.get("risk_score"), 0.5));
        profile.setTotalCounselingSessions(0);
        profile.setTotalProgressLogs(0);
        // Compute initial factor values from all available inmate data
        profile.setFactorValues(computeInitialFactors(features));
        profile.setLastUpdated(LocalDateTime.now());
        return profileRepository.save(profile);
    }
    
    private Program findBestProgram(AIRecommendationResponse aiResponse) {
        // 1. Try to match the AI-suggested program type
        if (aiResponse != null && !aiResponse.getPrograms().isEmpty()) {
            String programType = aiResponse.getPrograms().get(0).getProgramType();
            List<Program> byType = programRepository.findByType(programType);
            if (!byType.isEmpty()) return byType.get(0);
        }

        // 2. Fall back to any active program already in the DB
        List<Program> all = programRepository.findByActiveTrue();
        if (!all.isEmpty()) return all.get(0);

        // 3. No programs seeded yet — create a persistent default so future calls reuse it
        log.warn("No programs found in DB — creating default 'General Rehabilitation' program");
        Program defaultProg = new Program();
        defaultProg.setName("General Rehabilitation");
        defaultProg.setType("general");
        defaultProg.setDurationWeeks(12);
        defaultProg.setCapacity(50);
        defaultProg.setCurrentEnrollment(0);
        defaultProg.setDescription("Default rehabilitation program for newly assessed inmates");
        defaultProg.setActive(true);
        return programRepository.save(defaultProg);
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
        log.info("Profile update triggered for inmate: {} from medical report", inmateId);
    }

    // ── Factor value helpers ────────────────────────────────────────────────────

    /**
     * Compute initial eligibility factor values from the inmate data map.
     * Values are normalised to the 0-1 range that the AI service uses.
     */
    private Map<String, Double> computeInitialFactors(Map<String, Object> data) {
        Map<String, Double> f = new HashMap<>();
        if (data == null) return f;

        f.put("behavior_score",         normalise(data.get("behavior_score"),          10.0));
        f.put("discipline_score",        normalise(data.get("discipline_score"),         10.0));
        // Low risk is good — invert so higher factor value = better
        f.put("risk_score",              1.0 - Math.min(1.0, toDouble(data.get("risk_score"), 0.5)));

        double sentenceMonths = toDouble(data.get("sentence_length_months"), 24.0);
        double timeServed     = toDouble(data.get("time_served_months"),     0.0);
        f.put("time_served_ratio",
                sentenceMonths > 0 ? Math.min(1.0, timeServed / sentenceMonths) : 0.0);

        // Prior history — fewer is better
        f.put("prior_convictions",
                1.0 - Math.min(1.0, toDouble(data.get("prior_convictions"), 0.0) / 5.0));
        f.put("institutional_violations",
                1.0 - Math.min(1.0, toDouble(data.get("institutional_violations"), 0.0) / 10.0));
        f.put("total_incidents",
                1.0 - Math.min(1.0, toDouble(data.get("total_incidents"), 0.0) / 20.0));

        // Health flags — presence reduces factor value
        boolean hasSubstance  = Boolean.TRUE.equals(data.get("has_substance_abuse"));
        boolean hasMentalHlth = Boolean.TRUE.equals(data.get("has_mental_health_issues"));
        f.put("has_substance_abuse",     hasSubstance  ? 0.3 : 0.8);
        f.put("has_mental_health_issues", hasMentalHlth ? 0.4 : 0.8);

        // These start at neutral and improve through counseling / progress logs
        f.put("counseling_score",      0.5);
        f.put("total_attendance_rate", 0.0);
        f.put("programs_completed",    0.0);

        return f;
    }

    /** Normalise a raw score to [0,1]. */
    private double normalise(Object val, double maxVal) {
        return Math.min(1.0, Math.max(0.0, toDouble(val, maxVal / 2.0) / maxVal));
    }

    /** Detect suitability group from profile features for better initial placement. */
    private String detectSuitabilityGroup(Map<String, Object> data) {
        if (Boolean.TRUE.equals(data.get("has_substance_abuse")))   return "substance_abuse";
        if (Boolean.TRUE.equals(data.get("has_mental_health_issues"))) return "mental_health";
        return "general";
    }

    /**
     * Update eligibility factor values using exponential moving average after a
     * counseling session.  Triggered by both basic and AI-analysed note paths.
     *
     * @param sessionScore  counselor-given score (0-10); may be null
     * @param analysis      AI sentiment map {sentiment, score}; may be null
     */
    private void updateFactorValuesFromCounselingScore(String inmateId,
                                                        Double sessionScore,
                                                        Map<?, ?> analysis) {
        try {
            RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
            if (profile == null) return;

            Map<String, Double> factors = profile.getFactorValues() != null
                    ? new HashMap<>(profile.getFactorValues()) : new HashMap<>();

            // Use normalised session score (0-10 → 0-1) as counseling factor
            if (sessionScore != null) {
                double norm = Math.min(1.0, sessionScore / 10.0);
                double prev = factors.getOrDefault("counseling_score", 0.5);
                // EMA with α = 0.3
                factors.put("counseling_score", prev * 0.7 + norm * 0.3);
            }

            // Also nudge behaviour score based on AI sentiment direction
            if (analysis != null) {
                String sentiment = analysis.get("sentiment") != null
                        ? analysis.get("sentiment").toString() : "neutral";
                double behavior = factors.getOrDefault("behavior_score", 0.5);
                if ("positive".equalsIgnoreCase(sentiment)) {
                    factors.put("behavior_score", Math.min(1.0, behavior + 0.02));
                } else if ("negative".equalsIgnoreCase(sentiment)) {
                    factors.put("behavior_score", Math.max(0.0, behavior - 0.01));
                }
            }

            profile.setFactorValues(factors);
            profileRepository.save(profile);
        } catch (Exception e) {
            log.warn("Could not update factor values from counseling for {}: {}", inmateId, e.getMessage());
        }
    }

    /**
     * Update program-related factor values after a progress log entry.
     */
    private void updateFactorValuesFromProgress(String inmateId, Integer progressPct) {
        try {
            RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
            if (profile == null || progressPct == null) return;

            Map<String, Double> factors = profile.getFactorValues() != null
                    ? new HashMap<>(profile.getFactorValues()) : new HashMap<>();

            // EMA update for attendance rate
            double progressRate = progressPct / 100.0;
            double prev = factors.getOrDefault("total_attendance_rate", 0.0);
            factors.put("total_attendance_rate", prev * 0.6 + progressRate * 0.4);

            // Normalised program completion count (assume max meaningful = 5)
            List<Recommendation> recs = recommendationRepository.findByInmateId(inmateId);
            long completed = recs.stream()
                    .filter(r -> r.getStatus() == RecommendationStatus.COMPLETED).count();
            factors.put("programs_completed", Math.min(1.0, completed / 5.0));

            profile.setFactorValues(factors);
            profileRepository.save(profile);
        } catch (Exception e) {
            log.warn("Could not update factor values from progress for {}: {}", inmateId, e.getMessage());
        }
    }

    /**
     * Build a PostRehabPredictionRequest automatically from all stored rehabilitation
     * data for the given inmate — no manual form submission required.
     */
    private PostRehabPredictionRequest buildAutoPredictionRequest(String inmateId) {
        RehabProfile profile = profileRepository.findByInmateId(inmateId)
                .orElseThrow(() -> new RuntimeException(
                        "No rehabilitation profile found for inmate: " + inmateId));

        Map<String, Object> feat = profile.getProfileFeatures() != null
                ? profile.getProfileFeatures() : new HashMap<>();

        List<CounselingNote>       notes       = counselingNoteRepository.findByInmateId(inmateId);
        List<ProgressLog>          logs        = progressLogRepository.findByInmateId(inmateId);
        List<Recommendation>       recs        = recommendationRepository.findByInmateId(inmateId);
        List<EligibilityAssessment> assessments =
                eligibilityAssessmentRepository.findByInmateIdOrderByAssessedAtAsc(inmateId);

        double avgCounseling = notes.stream()
                .filter(n -> n.getSessionScore() != null)
                .mapToDouble(CounselingNote::getSessionScore)
                .average().orElse(5.0);  // 0-10 scale

        double avgProgress = logs.stream()
                .filter(l -> l.getProgressPercentage() != null)
                .mapToDouble(ProgressLog::getProgressPercentage)
                .average().orElse(0.0);  // 0-100

        long programsCompleted = recs.stream()
                .filter(r -> r.getStatus() == RecommendationStatus.COMPLETED).count();

        double latestEligScore = assessments.isEmpty()
                ? 0.5
                : assessments.get(assessments.size() - 1).getEligibilityScore();

        // Composite overall progress (mirrors getProgressSummary weighting)
        // behavior_score / discipline_score in profileFeatures are on the inmate-service's
        // 0-100 scale; the Python API also expects 0-100 for these two fields.
        double behaviorScore   = toDouble(feat.get("behavior_score"),   50.0);  // 0-100
        double disciplineScore = toDouble(feat.get("discipline_score"), 50.0);  // 0-100
        double riskRaw         = profile.getRiskScore() != null ? profile.getRiskScore() : 0.5;
        double overallProgress = Math.min(100.0,
                  (behaviorScore   / 100.0 * 25.0)  // 0-100 → 0-25
                + (avgCounseling   / 10.0  * 20.0)  // 0-10  → 0-20
                + (avgProgress     / 100.0 * 25.0)  // 0-100 → 0-25
                + (latestEligScore * 20.0)           // 0-1   → 0-20
                + ((1.0 - riskRaw) * 10.0));         // 0-1   → 0-10  (max total = 100)

        boolean rehabCompleted = programsCompleted > 0 && avgProgress >= 80.0;

        return PostRehabPredictionRequest.builder()
                .inmateId(inmateId)
                .sentenceLengthMonths((int) toDouble(feat.get("sentence_length_months"),  24.0))
                .timeServedMonths    ((int) toDouble(feat.get("time_served_months"),       0.0))
                .admissionDate(feat.containsKey("admission_date")
                        ? feat.get("admission_date").toString() : null)
                .behaviorScore  (behaviorScore)
                .disciplineScore(disciplineScore)
                .riskScore      (riskRaw)
                .programsCompleted     ((int) programsCompleted)
                .totalAttendanceRate   (avgProgress / 100.0)
                .priorConvictions      ((int) toDouble(feat.get("prior_convictions"),           0.0))
                .institutionalViolations((int) toDouble(feat.get("institutional_violations"),    0.0))
                .hasSubstanceAbuse    (Boolean.TRUE.equals(feat.get("has_substance_abuse")))
                .hasMentalHealthIssues(Boolean.TRUE.equals(feat.get("has_mental_health_issues")))
                .familySupport       (toDouble(feat.get("family_support"),        0.5))
                .communityTies       (toDouble(feat.get("community_ties"),         0.5))
                .employmentProspects (toDouble(feat.get("employment_prospects"),  0.5))
                .crimeSeverity       ((int) toDouble(feat.get("crime_severity"),   3.0))
                .caseType(feat.containsKey("case_type") ? feat.get("case_type").toString() : "general")
                .rehabProgramCompleted(rehabCompleted)
                .overallProgressScore (overallProgress)
                .counselingSessionsCompleted(notes.size())
                .avgCounselingScore  (avgCounseling)
                .medicalClearance    (true)
                .officerRecommendationScore(latestEligScore)
                .build();
    }
    
    private void updateProfileFromCounselingNote(String inmateId) {
        try {
            RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
            if (profile == null) return;
            List<CounselingNote> notes = counselingNoteRepository.findByInmateId(inmateId);
            double avg = notes.stream()
                    .filter(n -> n.getSessionScore() != null)
                    .mapToDouble(CounselingNote::getSessionScore)
                    .average().orElse(0.0);
            profile.setAvgCounselingScore(avg);
            profile.setTotalCounselingSessions(notes.size());
            profile.setLastUpdated(LocalDateTime.now());
            profileRepository.save(profile);
        } catch (Exception e) {
            log.warn("Could not update profile counseling stats for {}: {}", inmateId, e.getMessage());
        }
    }

    private void updateProfileFromProgressLog(String inmateId, Integer progressPercentage) {
        try {
            RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
            if (profile == null) return;
            List<ProgressLog> logs = progressLogRepository.findByInmateId(inmateId);
            if (progressPercentage != null) {
                profile.setLatestProgressPercentage(progressPercentage);
            }
            profile.setTotalProgressLogs(logs.size());
            profile.setLastUpdated(LocalDateTime.now());
            profileRepository.save(profile);
        } catch (Exception e) {
            log.warn("Could not update profile progress stats for {}: {}", inmateId, e.getMessage());
        }
    }

    private void updateProfileEligibility(String inmateId, Double eligibilityScore) {
        try {
            RehabProfile profile = profileRepository.findByInmateId(inmateId).orElse(null);
            if (profile == null) return;
            profile.setLatestEligibilityScore(eligibilityScore);
            profile.setLastUpdated(LocalDateTime.now());
            profileRepository.save(profile);
        } catch (Exception e) {
            log.warn("Could not update profile eligibility for {}: {}", inmateId, e.getMessage());
        }
    }
    
    private void publishRecommendationEvent(Recommendation recommendation) {
        sendKafkaSafely("rehab.recommendation.created", recommendation.getInmateId());
    }

    /**
     * Send a Kafka event, catching all exceptions so messaging failures
     * never break the HTTP response.
     */
    private void sendKafkaSafely(String topic, String value) {
        try {
            kafkaTemplate.send(topic, value);
        } catch (Exception e) {
            log.warn("Kafka unavailable — skipping event publish to topic '{}': {}", topic, e.getMessage());
        }
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
