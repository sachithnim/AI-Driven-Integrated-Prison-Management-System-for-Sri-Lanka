package com.pms.inmateservice.service;

import com.pms.inmateservice.dto.*;
import com.pms.inmateservice.model.*;
import com.pms.inmateservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InmateService {

    private final InmateRepository inmateRepository;
    private final CellRepository cellRepository;
    private final BehaviorIncidentRepository behaviorIncidentRepository;
    private final VisitorLogRepository visitorLogRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final EducationProgramRepository educationProgramRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final WebClient.Builder webClientBuilder;

    @Value("${rehabilitation.ai.url:http://rehabilitation-ai:8001}")
    private String rehabilitationAiUrl;

    @Transactional
    public InmateResponseDTO createInmate(InmateRequestDTO requestDTO) {
        log.info("Creating new inmate: {} {}", requestDTO.getFirstName(), requestDTO.getLastName());

        Inmate inmate = mapToEntity(requestDTO);
        
        // AI scoring deferred — set defaults at registration time
        inmate.setBehaviorScore(70.0);
        inmate.setDisciplineScore(70.0);
        inmate.setRiskScore(0.5);
        inmate.setAiReasoning("Pending AI Assessment");

        inmate.setStatus(InmateStatus.ACTIVE);
        inmate.setCreatedAt(java.time.LocalDateTime.now());

        Inmate savedInmate = inmateRepository.save(inmate);
        log.info("Inmate created successfully with ID: {}", savedInmate.getId());

        // Publish Kafka event
        publishInmateAdmittedEvent(savedInmate);

        return mapToResponseDTO(savedInmate);
    }

    @Transactional(readOnly = true)
    public InmateResponseDTO getInmateById(Long id) {
        log.info("Fetching inmate with ID: {}", id);
        Inmate inmate = inmateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inmate not found with ID: " + id));

        InmateResponseDTO response = mapToResponseDTO(inmate);
        
        // Add statistics
        response.setTotalIncidents(behaviorIncidentRepository.countByInmateId(id));
        response.setTotalVisits((long) visitorLogRepository.findByInmateId(id).size());

        return response;
    }

    @Transactional
    public InmateResponseDTO runAiInitialAssessment(Long id) {
        log.info("Running AI initial assessment for inmate ID: {}", id);
        Inmate inmate = inmateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inmate not found with ID: " + id));

        try {
            java.util.Map<String, Object> aiRequest = new java.util.HashMap<>();
            aiRequest.put("crimeDescription", inmate.getCrimeDescription() != null ? inmate.getCrimeDescription() : "Unknown");
            aiRequest.put("caseType", inmate.getCaseType() != null ? inmate.getCaseType().toString() : "Unknown");
            aiRequest.put("sentenceDurationMonths", inmate.getSentenceDurationMonths() != null ? inmate.getSentenceDurationMonths() : 0);
            aiRequest.put("age", inmate.getAge() != null ? inmate.getAge() : 30);
            aiRequest.put("riskHistory", java.util.List.of(
                inmate.getViolentHistory() != null && inmate.getViolentHistory() ? "Violent History" : "",
                inmate.getEscapeRisk() != null && inmate.getEscapeRisk() ? "Escape Risk" : "",
                inmate.getGangAffiliation() != null && inmate.getGangAffiliation() ? "Gang Affiliation" : ""
            ).stream().filter(s -> !s.isEmpty()).collect(Collectors.toList()));
            aiRequest.put("notes", "Registration assessment");

            java.util.Map response = webClientBuilder.build()
                    .post()
                    .uri(rehabilitationAiUrl + "/api/v1/scoring/initial-assessment")
                    .bodyValue(aiRequest)
                    .retrieve()
                    .bodyToMono(java.util.Map.class)
                    .block();

            if (response != null) {
                if (response.containsKey("behavior_score")) {
                    inmate.setBehaviorScore(Double.valueOf(response.get("behavior_score").toString()));
                }
                if (response.containsKey("discipline_score")) {
                    inmate.setDisciplineScore(Double.valueOf(response.get("discipline_score").toString()));
                }
                if (response.containsKey("risk_score")) {
                    inmate.setRiskScore(Double.valueOf(response.get("risk_score").toString()));
                }
                if (response.containsKey("reasoning")) {
                    inmate.setAiReasoning(response.get("reasoning").toString());
                }
                inmateRepository.save(inmate);
                log.info("Successfully updated AI scores for inmate ID: {}", id);
            }
        } catch (Exception e) {
            log.error("Failed to run AI assessment for inmate ID {}: {}", id, e.getMessage());
        }

        return getInmateById(id);
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> getAllInmates() {
        log.info("Fetching all inmates");
        return inmateRepository.findAll().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> searchInmates(String searchTerm) {
        log.info("Searching inmates with term: {}", searchTerm);
        return inmateRepository.searchInmates(searchTerm).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> filterInmates(InmateFilterDTO filter) {
        log.info("Filtering inmates with criteria: {}", filter);
        
        List<Inmate> inmates = inmateRepository.findAll();
        
        if (filter.getSearchTerm() != null && !filter.getSearchTerm().isEmpty()) {
            inmates = inmateRepository.searchInmates(filter.getSearchTerm());
        } else if (filter.getStatus() != null) {
            inmates = inmateRepository.findByStatus(filter.getStatus());
        } else if (filter.getSecurityLevel() != null) {
            inmates = inmateRepository.findBySecurityLevel(filter.getSecurityLevel());
        } else if (filter.getCurrentFacility() != null) {
            inmates = inmateRepository.findByCurrentFacility(filter.getCurrentFacility());
        }

        // Apply additional filters
        return inmates.stream()
                .filter(inmate -> filter.getBlock() == null || filter.getBlock().equals(inmate.getBlock()))
                .filter(inmate -> filter.getGangAffiliation() == null || filter.getGangAffiliation().equals(inmate.getGangAffiliation()))
                .filter(inmate -> filter.getHighRisk() == null || 
                        (filter.getHighRisk() && (inmate.getEscapeRisk() || inmate.getViolentHistory())))
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public InmateResponseDTO updateInmate(Long id, InmateRequestDTO requestDTO) {
        log.info("Updating inmate with ID: {}", id);

        Inmate inmate = inmateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inmate not found with ID: " + id));

        updateInmateFromDTO(inmate, requestDTO);
        inmate.setUpdatedAt(java.time.LocalDateTime.now());

        Inmate updatedInmate = inmateRepository.save(inmate);
        log.info("Inmate updated successfully: {}", updatedInmate.getId());

        return mapToResponseDTO(updatedInmate);
    }

    @Transactional
    public void deleteInmate(Long id) {
        log.info("Deleting inmate with ID: {}", id);
        
        if (!inmateRepository.existsById(id)) {
            throw new RuntimeException("Inmate not found with ID: " + id);
        }

        inmateRepository.deleteById(id);
        log.info("Inmate deleted successfully: {}", id);
    }

    @Transactional
    public InmateResponseDTO releaseInmate(Long id) {
        log.info("Releasing inmate with ID: {}", id);

        Inmate inmate = inmateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inmate not found with ID: " + id));

        inmate.setStatus(InmateStatus.RELEASED);
        inmate.setReleaseDate(LocalDate.now());
        inmate.setUpdatedAt(java.time.LocalDateTime.now());

        Inmate releasedInmate = inmateRepository.save(inmate);
        log.info("Inmate released successfully: {}", releasedInmate.getId());

        // Publish Kafka event
        publishInmateReleasedEvent(releasedInmate);

        return mapToResponseDTO(releasedInmate);
    }

    @Transactional
    public InmateResponseDTO transferInmate(Long id, String newFacility, String newBlock, String newCell) {
        log.info("Transferring inmate {} to facility: {}", id, newFacility);

        Inmate inmate = inmateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inmate not found with ID: " + id));

        String oldFacility = inmate.getCurrentFacility();
        inmate.setCurrentFacility(newFacility);
        inmate.setBlock(newBlock);
        inmate.setCellNumber(newCell);
        inmate.setUpdatedAt(java.time.LocalDateTime.now());

        Inmate transferredInmate = inmateRepository.save(inmate);
        log.info("Inmate transferred successfully from {} to {}", oldFacility, newFacility);

        // Publish Kafka event
        publishInmateTransferredEvent(transferredInmate, oldFacility, newFacility);

        return mapToResponseDTO(transferredInmate);
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> getUpcomingReleases(int days) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(days);
        
        return inmateRepository.findUpcomingReleases(startDate, endDate).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> getParoleEligible(int days) {
        LocalDate startDate = LocalDate.now();
        LocalDate endDate = startDate.plusDays(days);
        
        return inmateRepository.findByParoleEligibilityDateBetween(startDate, endDate).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<InmateResponseDTO> getHighRiskInmates() {
        return inmateRepository.findHighRiskInmates().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    // Helper methods for mapping
    private Inmate mapToEntity(InmateRequestDTO dto) {
        Inmate inmate = new Inmate();
        updateInmateFromDTO(inmate, dto);
        return inmate;
    }

    private void updateInmateFromDTO(Inmate inmate, InmateRequestDTO dto) {
        inmate.setFirstName(dto.getFirstName());
        inmate.setLastName(dto.getLastName());
        inmate.setMiddleName(dto.getMiddleName());
        inmate.setDateOfBirth(dto.getDateOfBirth());
        inmate.setGender(dto.getGender());
        inmate.setNationality(dto.getNationality());
        inmate.setNic(dto.getNic());
        inmate.setContactNumber(dto.getContactNumber());
        
        // Demographic & Background fields
        inmate.setReligion(dto.getReligion());
        inmate.setMaritalStatus(dto.getMaritalStatus());
        inmate.setLiteracyLevel(dto.getLiteracyLevel());
        inmate.setPreviousConvictions(dto.getPreviousConvictions());
        inmate.setPreviousPunishments(dto.getPreviousPunishments());
        inmate.setIncomeLevel(dto.getIncomeLevel());
        inmate.setAddictions(dto.getAddictions());
        inmate.setOccupation(dto.getOccupation());
        inmate.setConvictionStatus(dto.getConvictionStatus() != null ? dto.getConvictionStatus() : com.pms.inmateservice.model.ConvictionStatus.UNCONVICTED);
        
        inmate.setCaseType(dto.getCaseType());
        inmate.setCaseNumber(dto.getCaseNumber());
        inmate.setSentenceStartDate(dto.getSentenceStartDate());
        inmate.setSentenceEndDate(dto.getSentenceEndDate());
        inmate.setParoleEligibilityDate(dto.getParoleEligibilityDate());
        inmate.setSentenceDurationMonths(dto.getSentenceDurationMonths());
        inmate.setCrimeDescription(dto.getCrimeDescription());
        inmate.setCourt(dto.getCourt());
        inmate.setJudge(dto.getJudge());
        
        inmate.setSecurityLevel(dto.getSecurityLevel());
        inmate.setCurrentFacility(dto.getCurrentFacility());
        
        if (dto.getCellId() != null) {
            Cell cell = cellRepository.findById(dto.getCellId())
                    .orElseThrow(() -> new RuntimeException("Cell not found with ID: " + dto.getCellId()));
            inmate.setCell(cell);
            inmate.setBlock(cell.getBlock());
            inmate.setCellNumber(cell.getCellNumber());
        } else {
            inmate.setBlock(dto.getBlock());
            inmate.setCellNumber(dto.getCellNumber());
        }
        
        inmate.setAdmissionDate(dto.getAdmissionDate());
        
        inmate.setHeight(dto.getHeight());
        inmate.setWeight(dto.getWeight());
        inmate.setEyeColor(dto.getEyeColor());
        inmate.setHairColor(dto.getHairColor());
        inmate.setIdentifyingMarks(dto.getIdentifyingMarks());
        inmate.setTattoos(dto.getTattoos());
        
        inmate.setMedicalConditions(dto.getMedicalConditions());
        inmate.setAllergies(dto.getAllergies());
        inmate.setMedications(dto.getMedications());
        inmate.setBloodType(dto.getBloodType());
        
        inmate.setRiskLevel(dto.getRiskLevel());
        inmate.setRiskHistory(dto.getRiskHistory());
        inmate.setGangAffiliation(dto.getGangAffiliation());
        inmate.setGangName(dto.getGangName());
        inmate.setViolentHistory(dto.getViolentHistory());
        inmate.setEscapeRisk(dto.getEscapeRisk());
        inmate.setSuicideRisk(dto.getSuicideRisk());
        
        if (dto.getStatus() != null) {
            inmate.setStatus(dto.getStatus());
        }
        
        inmate.setNotes(dto.getNotes());
    }

    private InmateResponseDTO mapToResponseDTO(Inmate inmate) {
        InmateResponseDTO dto = new InmateResponseDTO();
        dto.setId(inmate.getId());
        dto.setFirstName(inmate.getFirstName());
        dto.setLastName(inmate.getLastName());
        dto.setMiddleName(inmate.getMiddleName());
        dto.setFullName(inmate.getFullName());
        dto.setDateOfBirth(inmate.getDateOfBirth());
        dto.setAge(inmate.getAge());
        dto.setGender(inmate.getGender());
        dto.setNationality(inmate.getNationality());
        dto.setNic(inmate.getNic());
        dto.setAddress(inmate.getAddress());
        dto.setContactNumber(inmate.getContactNumber());
        
        dto.setCaseType(inmate.getCaseType());
        dto.setCaseNumber(inmate.getCaseNumber());
        dto.setSentenceStartDate(inmate.getSentenceStartDate());
        dto.setSentenceEndDate(inmate.getSentenceEndDate());
        dto.setParoleEligibilityDate(inmate.getParoleEligibilityDate());
        dto.setSentenceDurationMonths(inmate.getSentenceDurationMonths());
        dto.setDaysServed(inmate.getDaysServed());
        dto.setDaysRemaining(inmate.getDaysRemaining());
        dto.setCrimeDescription(inmate.getCrimeDescription());
        dto.setCourt(inmate.getCourt());
        dto.setJudge(inmate.getJudge());
        
        dto.setSecurityLevel(inmate.getSecurityLevel());
        dto.setCurrentFacility(inmate.getCurrentFacility());
        dto.setBlock(inmate.getBlock());
        dto.setCellNumber(inmate.getCellNumber());
        dto.setAdmissionDate(inmate.getAdmissionDate());
        dto.setReleaseDate(inmate.getReleaseDate());
        
        dto.setHeight(inmate.getHeight());
        dto.setWeight(inmate.getWeight());
        dto.setEyeColor(inmate.getEyeColor());
        dto.setHairColor(inmate.getHairColor());
        dto.setIdentifyingMarks(inmate.getIdentifyingMarks());
        dto.setTattoos(inmate.getTattoos());
        
        dto.setMedicalConditions(inmate.getMedicalConditions());
        dto.setAllergies(inmate.getAllergies());
        dto.setMedications(inmate.getMedications());
        dto.setBloodType(inmate.getBloodType());
        
        dto.setRiskLevel(inmate.getRiskLevel());
        dto.setRiskHistory(inmate.getRiskHistory());
        dto.setGangAffiliation(inmate.getGangAffiliation());
        dto.setGangName(inmate.getGangName());
        dto.setViolentHistory(inmate.getViolentHistory());
        dto.setEscapeRisk(inmate.getEscapeRisk());
        dto.setSuicideRisk(inmate.getSuicideRisk());
        
        dto.setStatus(inmate.getStatus());
        dto.setCloseFaceImagePath(inmate.getCloseFaceImagePath());
        dto.setFullBodyImagePath(inmate.getFullBodyImagePath());
        dto.setFingerprintsImagePath(inmate.getFingerprintsImagePath());
        dto.setImageUploadDate(inmate.getImageUploadDate());
        
        dto.setCreatedAt(inmate.getCreatedAt());
        dto.setUpdatedAt(inmate.getUpdatedAt());
        dto.setCreatedBy(inmate.getCreatedBy());
        dto.setUpdatedBy(inmate.getUpdatedBy());
        dto.setNotes(inmate.getNotes());

        // Demographics
        dto.setReligion(inmate.getReligion());
        dto.setMaritalStatus(inmate.getMaritalStatus());
        dto.setLiteracyLevel(inmate.getLiteracyLevel());
        dto.setPreviousConvictions(inmate.getPreviousConvictions());
        dto.setPreviousPunishments(inmate.getPreviousPunishments());
        dto.setIncomeLevel(inmate.getIncomeLevel());
        dto.setAddictions(inmate.getAddictions());
        dto.setOccupation(inmate.getOccupation());
        dto.setConvictionStatus(inmate.getConvictionStatus());
        
        // AI Scores
        dto.setBehaviorScore(inmate.getBehaviorScore());
        dto.setDisciplineScore(inmate.getDisciplineScore());
        dto.setRiskScore(inmate.getRiskScore());
        dto.setAiReasoning(inmate.getAiReasoning());
        
        return dto;
    }

    // Kafka event publishing — fire-and-forget, never blocks registration
    private void publishInmateAdmittedEvent(Inmate inmate) {
        try {
            kafkaTemplate.send("inmate.admitted", inmate.getId().toString(), mapToResponseDTO(inmate))
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka delivery failed for inmate.admitted (ID {}): {}", inmate.getId(), ex.getMessage());
                        } else {
                            log.info("Published inmate.admitted event for ID: {}", inmate.getId());
                        }
                    });
        } catch (Exception e) {
            log.warn("Kafka unavailable — skipping inmate.admitted event for ID {}: {}", inmate.getId(), e.getMessage());
        }
    }

    private void publishInmateReleasedEvent(Inmate inmate) {
        try {
            kafkaTemplate.send("inmate.released", inmate.getId().toString(), mapToResponseDTO(inmate))
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka delivery failed for inmate.released (ID {}): {}", inmate.getId(), ex.getMessage());
                        } else {
                            log.info("Published inmate.released event for ID: {}", inmate.getId());
                        }
                    });
        } catch (Exception e) {
            log.warn("Kafka unavailable — skipping inmate.released event for ID {}: {}", inmate.getId(), e.getMessage());
        }
    }

    @Transactional
    public void updateInmateImage(Long inmateId, String imageType, String imagePath) {
        Inmate inmate = inmateRepository.findById(inmateId)
                .orElseThrow(() -> new RuntimeException("Inmate not found"));
        
        if ("closeFace".equals(imageType)) {
            inmate.setCloseFaceImagePath(imagePath);
        } else if ("fullBody".equals(imageType)) {
            inmate.setFullBodyImagePath(imagePath);
        }
        
        inmate.setImageUploadDate(LocalDate.now().toString());
        inmateRepository.save(inmate);
        log.info("Updated {} image for inmate ID: {}", imageType, inmateId);
    }

    private void publishInmateTransferredEvent(Inmate inmate, String oldFacility, String newFacility) {
        try {
            kafkaTemplate.send("inmate.transferred", inmate.getId().toString(), mapToResponseDTO(inmate))
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.warn("Kafka delivery failed for inmate.transferred (ID {}): {}", inmate.getId(), ex.getMessage());
                        } else {
                            log.info("Published inmate.transferred event for ID: {}", inmate.getId());
                        }
                    });
        } catch (Exception e) {
            log.warn("Kafka unavailable — skipping inmate.transferred event for ID {}: {}", inmate.getId(), e.getMessage());
        }
    }
}
