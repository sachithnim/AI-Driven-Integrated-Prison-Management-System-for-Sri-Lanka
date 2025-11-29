package com.pms.inmateservice.service;

import com.pms.inmateservice.dto.*;
import com.pms.inmateservice.model.*;
import com.pms.inmateservice.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InmateService {

    private final InmateRepository inmateRepository;
    private final BehaviorIncidentRepository behaviorIncidentRepository;
    private final VisitorLogRepository visitorLogRepository;
    private final EmergencyContactRepository emergencyContactRepository;
    private final WorkAssignmentRepository workAssignmentRepository;
    private final EducationProgramRepository educationProgramRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Transactional
    public InmateResponseDTO createInmate(InmateRequestDTO requestDTO) {
        log.info("Creating new inmate: {}", requestDTO.getBookingNumber());

        // Check if booking number already exists
        if (inmateRepository.findByBookingNumber(requestDTO.getBookingNumber()).isPresent()) {
            throw new RuntimeException("Inmate with booking number " + requestDTO.getBookingNumber() + " already exists");
        }

        Inmate inmate = mapToEntity(requestDTO);
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

    @Transactional(readOnly = true)
    public InmateResponseDTO getInmateByBookingNumber(String bookingNumber) {
        log.info("Fetching inmate with booking number: {}", bookingNumber);
        Inmate inmate = inmateRepository.findByBookingNumber(bookingNumber)
                .orElseThrow(() -> new RuntimeException("Inmate not found with booking number: " + bookingNumber));
        return mapToResponseDTO(inmate);
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
        inmate.setBookingNumber(dto.getBookingNumber());
        inmate.setFirstName(dto.getFirstName());
        inmate.setLastName(dto.getLastName());
        inmate.setMiddleName(dto.getMiddleName());
        inmate.setDateOfBirth(dto.getDateOfBirth());
        inmate.setGender(dto.getGender());
        inmate.setNationality(dto.getNationality());
        inmate.setNic(dto.getNic());
        inmate.setAddress(dto.getAddress());
        inmate.setContactNumber(dto.getContactNumber());
        
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
        inmate.setBlock(dto.getBlock());
        inmate.setCellNumber(dto.getCellNumber());
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
        
        inmate.setPhotoUrl(dto.getPhotoUrl());
        inmate.setFingerprintsUrl(dto.getFingerprintsUrl());
        inmate.setNotes(dto.getNotes());
    }

    private InmateResponseDTO mapToResponseDTO(Inmate inmate) {
        InmateResponseDTO dto = new InmateResponseDTO();
        dto.setId(inmate.getId());
        dto.setBookingNumber(inmate.getBookingNumber());
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
        dto.setPhotoUrl(inmate.getPhotoUrl());
        dto.setFingerprintsUrl(inmate.getFingerprintsUrl());
        
        dto.setCreatedAt(inmate.getCreatedAt());
        dto.setUpdatedAt(inmate.getUpdatedAt());
        dto.setCreatedBy(inmate.getCreatedBy());
        dto.setUpdatedBy(inmate.getUpdatedBy());
        dto.setNotes(inmate.getNotes());
        
        return dto;
    }

    // Kafka event publishing
    private void publishInmateAdmittedEvent(Inmate inmate) {
        try {
            kafkaTemplate.send("inmate.admitted", inmate.getId().toString(), mapToResponseDTO(inmate));
            log.info("Published inmate admitted event for ID: {}", inmate.getId());
        } catch (Exception e) {
            log.error("Failed to publish inmate admitted event", e);
        }
    }

    private void publishInmateReleasedEvent(Inmate inmate) {
        try {
            kafkaTemplate.send("inmate.released", inmate.getId().toString(), mapToResponseDTO(inmate));
            log.info("Published inmate released event for ID: {}", inmate.getId());
        } catch (Exception e) {
            log.error("Failed to publish inmate released event", e);
        }
    }

    private void publishInmateTransferredEvent(Inmate inmate, String oldFacility, String newFacility) {
        try {
            kafkaTemplate.send("inmate.transferred", inmate.getId().toString(), 
                    mapToResponseDTO(inmate));
            log.info("Published inmate transferred event for ID: {}", inmate.getId());
        } catch (Exception e) {
            log.error("Failed to publish inmate transferred event", e);
        }
    }
}
