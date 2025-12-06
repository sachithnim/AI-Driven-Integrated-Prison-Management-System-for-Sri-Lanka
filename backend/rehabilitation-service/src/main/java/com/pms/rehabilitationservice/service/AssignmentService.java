package com.pms.rehabilitationservice.service;

import com.pms.rehabilitationservice.model.MedicalOfficer;
import com.pms.rehabilitationservice.model.RehabStation;
import com.pms.rehabilitationservice.repository.MedicalOfficerRepository;
import com.pms.rehabilitationservice.repository.RehabStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

/**
 * Service for assigning medical officers and rehab stations using scoring algorithm
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AssignmentService {
    
    private final RehabStationRepository stationRepository;
    private final MedicalOfficerRepository officerRepository;
    
    // Weights for scoring algorithm
    private static final double W_SPECIALIZATION = 0.4;
    private static final double W_PROXIMITY = 0.2;
    private static final double W_LOAD = 0.2;
    private static final double W_SUCCESS_RATE = 0.2;
    
    /**
     * Assign best rehab station based on inmate needs
     */
    public RehabStation assignStation(List<String> inmateNeeds, String inmateZone) {
        List<RehabStation> availableStations = stationRepository.findAvailableStations();
        
        if (availableStations.isEmpty()) {
            log.warn("No available stations found");
            return null;
        }
        
        return availableStations.stream()
                .map(station -> new ScoredStation(station, calculateStationScore(station, inmateNeeds, inmateZone)))
                .max(Comparator.comparing(ScoredStation::score))
                .map(ScoredStation::station)
                .orElse(null);
    }
    
    /**
     * Assign best medical officer based on inmate needs and station
     */
    public MedicalOfficer assignOfficer(List<String> inmateNeeds, Long stationId) {
        List<MedicalOfficer> availableOfficers = officerRepository.findAvailableOfficers();
        
        if (availableOfficers.isEmpty()) {
            log.warn("No available officers found");
            return null;
        }
        
        // Filter by assigned station if specified
        if (stationId != null) {
            availableOfficers = availableOfficers.stream()
                    .filter(o -> stationId.equals(o.getAssignedStationId()))
                    .toList();
        }
        
        if (availableOfficers.isEmpty()) {
            log.warn("No available officers at station {}", stationId);
            return null;
        }
        
        return availableOfficers.stream()
                .map(officer -> new ScoredOfficer(officer, calculateOfficerScore(officer, inmateNeeds)))
                .max(Comparator.comparing(ScoredOfficer::score))
                .map(ScoredOfficer::officer)
                .orElse(null);
    }
    
    /**
     * Calculate match score for a station
     * Score = w1*specialization + w2*proximity + w3*load_factor + w4*success_rate
     */
    private double calculateStationScore(RehabStation station, List<String> inmateNeeds, String inmateZone) {
        double specializationScore = calculateSpecializationMatch(station.getSpecializations(), inmateNeeds);
        double proximityScore = calculateProximityScore(station.getZone(), inmateZone);
        double loadScore = calculateLoadScore(station.getCurrentLoad(), station.getCapacity());
        double successRateScore = station.getSuccessRate() != null ? station.getSuccessRate() : 0.5;
        
        return W_SPECIALIZATION * specializationScore +
               W_PROXIMITY * proximityScore +
               W_LOAD * loadScore +
               W_SUCCESS_RATE * successRateScore;
    }
    
    /**
     * Calculate match score for an officer
     */
    private double calculateOfficerScore(MedicalOfficer officer, List<String> inmateNeeds) {
        double specializationScore = calculateSpecializationMatch(officer.getSpecializations(), inmateNeeds);
        double loadScore = calculateLoadScore(officer.getCurrentLoad(), officer.getMaxCapacity());
        double successRateScore = officer.getSuccessRate() != null ? officer.getSuccessRate() : 0.5;
        
        return W_SPECIALIZATION * specializationScore +
               W_LOAD * loadScore +
               W_SUCCESS_RATE * successRateScore;
    }
    
    /**
     * Calculate specialization match score (0-1)
     */
    private double calculateSpecializationMatch(List<String> availableSpecializations, List<String> needs) {
        if (needs == null || needs.isEmpty()) return 0.5;
        if (availableSpecializations == null || availableSpecializations.isEmpty()) return 0.0;
        
        long matchCount = needs.stream()
                .filter(need -> availableSpecializations.stream()
                        .anyMatch(spec -> spec.equalsIgnoreCase(need)))
                .count();
        
        return (double) matchCount / needs.size();
    }
    
    /**
     * Calculate proximity score (0-1, higher is better)
     */
    private double calculateProximityScore(String stationZone, String inmateZone) {
        if (stationZone == null || inmateZone == null) return 0.5;
        return stationZone.equalsIgnoreCase(inmateZone) ? 1.0 : 0.3;
    }
    
    /**
     * Calculate load score (0-1, lower load is better)
     */
    private double calculateLoadScore(int currentLoad, int capacity) {
        if (capacity == 0) return 0.0;
        double utilization = (double) currentLoad / capacity;
        return 1.0 - utilization; // Less loaded = higher score
    }
    
    // Helper records for scoring
    private record ScoredStation(RehabStation station, double score) {}
    private record ScoredOfficer(MedicalOfficer officer, double score) {}
}
