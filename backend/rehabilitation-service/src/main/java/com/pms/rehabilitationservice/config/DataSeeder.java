package com.pms.rehabilitationservice.config;

import com.pms.rehabilitationservice.model.MedicalOfficer;
import com.pms.rehabilitationservice.model.Program;
import com.pms.rehabilitationservice.model.RehabStation;
import com.pms.rehabilitationservice.repository.MedicalOfficerRepository;
import com.pms.rehabilitationservice.repository.ProgramRepository;
import com.pms.rehabilitationservice.repository.RehabStationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final ProgramRepository programRepository;
    private final RehabStationRepository stationRepository;
    private final MedicalOfficerRepository officerRepository;

    @Override
    public void run(String... args) throws Exception {
        seedPrograms();
        seedStations();
        seedOfficers();
    }

    private void seedPrograms() {
        if (programRepository.count() > 0) {
            log.info("Programs already seeded");
            return;
        }

        log.info("Seeding programs...");

        List<Program> programs = Arrays.asList(
            new Program(null, "Intensive Drug Rehabilitation Program", "substance_abuse_intensive", 12, 
                Arrays.asList("commitment", "detox_clearance"), 30, 0, 
                "Intensive 12-week program for severe substance dependency", true),
            
            new Program(null, "Standard Substance Abuse Program", "substance_abuse_standard", 8, 
                Arrays.asList("commitment"), 40, 0, 
                "Standard 8-week program for moderate substance issues", true),
            
            new Program(null, "Trauma-Informed Therapy Program", "mental_health_therapy", 10, 
                Arrays.asList("stability"), 20, 0, 
                "Professional therapy for trauma and mental health conditions", true),
            
            new Program(null, "Vocational Skills Training", "vocational_training", 16, 
                Arrays.asList("literacy", "physical_fitness"), 50, 0, 
                "Practical vocational training for employment readiness", true),
            
            new Program(null, "GED Preparation Program", "education_program", 20, 
                Arrays.asList("literacy_basic"), 40, 0, 
                "Educational advancement and GED certification", true),
            
            new Program(null, "Anger Management & Conflict Resolution", "anger_management", 10, 
                Arrays.asList("group_participation"), 25, 0, 
                "Behavioral intervention for violence risk reduction", true),
            
            new Program(null, "Cognitive Behavioral Therapy (CBT)", "cognitive_behavioral", 8, 
                Arrays.asList("cognitive_ability"), 30, 0, 
                "Evidence-based CBT for behavior modification", true),
            
            new Program(null, "Family Reintegration & Counseling", "family_counseling", 12, 
                Arrays.asList("family_contact"), 20, 0, 
                "Family-focused rehabilitation and reintegration support", true)
        );

        programRepository.saveAll(programs);
        log.info("Seeded {} programs", programs.size());
    }

    private void seedStations() {
        if (stationRepository.count() > 0) {
            log.info("Stations already seeded");
            return;
        }

        log.info("Seeding stations...");

        List<RehabStation> stations = Arrays.asList(
            new RehabStation(null, "Central Rehab Unit", "Block A", "general", 100, 0, 
                Arrays.asList("general", "vocational"), 0.85, true),
            
            new RehabStation(null, "Medical Wing", "Block M", "medical", 50, 0, 
                Arrays.asList("substance_abuse", "mental_health"), 0.90, true),
            
            new RehabStation(null, "Education Center", "Block E", "education", 60, 0, 
                Arrays.asList("education", "vocational"), 0.80, true),
            
            new RehabStation(null, "Behavioral Unit", "Block B", "high_security", 40, 0, 
                Arrays.asList("behavioral", "anger_management"), 0.75, true)
        );

        stationRepository.saveAll(stations);
        log.info("Seeded {} stations", stations.size());
    }

    private void seedOfficers() {
        if (officerRepository.count() > 0) {
            log.info("Officers already seeded");
            return;
        }

        log.info("Seeding officers...");

        // We need to fetch stations to assign IDs, but for simplicity we'll assume IDs 1-4 or fetch them
        // Since we just saved them, we can fetch them back or just rely on auto-increment if we are sure.
        // Better to fetch.
        
        List<RehabStation> stations = stationRepository.findAll();
        Long medicalStationId = stations.stream()
            .filter(s -> s.getName().equals("Medical Wing"))
            .findFirst().map(RehabStation::getId).orElse(null);
            
        Long generalStationId = stations.stream()
            .filter(s -> s.getName().equals("Central Rehab Unit"))
            .findFirst().map(RehabStation::getId).orElse(null);

        List<MedicalOfficer> officers = Arrays.asList(
            new MedicalOfficer(null, "OFF-001", "Dr. Sarah Smith", 
                Arrays.asList("psychiatry", "substance_abuse"), medicalStationId, 0, 15, 0.92, true),
            
            new MedicalOfficer(null, "OFF-002", "Dr. James Wilson", 
                Arrays.asList("general_medicine", "trauma"), medicalStationId, 0, 20, 0.88, true),
            
            new MedicalOfficer(null, "OFF-003", "Counselor Emily Brown", 
                Arrays.asList("counseling", "behavioral"), generalStationId, 0, 12, 0.85, true),
            
            new MedicalOfficer(null, "OFF-004", "Officer Michael Davis", 
                Arrays.asList("vocational", "security"), generalStationId, 0, 25, 0.80, true)
        );

        officerRepository.saveAll(officers);
        log.info("Seeded {} officers", officers.size());
    }
}
