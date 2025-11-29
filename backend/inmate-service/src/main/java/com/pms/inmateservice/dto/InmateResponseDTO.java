package com.pms.inmateservice.dto;

import com.pms.inmateservice.model.CaseType;
import com.pms.inmateservice.model.InmateStatus;
import com.pms.inmateservice.model.SecurityLevel;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class InmateResponseDTO {

    private Long id;
    private String bookingNumber;
    private String firstName;
    private String lastName;
    private String middleName;
    private String fullName;
    private LocalDate dateOfBirth;
    private Integer age;
    private String gender;
    private String nationality;
    private String nic;
    private String address;
    private String contactNumber;

    // Case Information
    private CaseType caseType;
    private String caseNumber;
    private LocalDate sentenceStartDate;
    private LocalDate sentenceEndDate;
    private LocalDate paroleEligibilityDate;
    private Integer sentenceDurationMonths;
    private Integer daysServed;
    private Integer daysRemaining;
    private String crimeDescription;
    private String court;
    private String judge;

    // Facility Information
    private SecurityLevel securityLevel;
    private String currentFacility;
    private String block;
    private String cellNumber;
    private LocalDate admissionDate;
    private LocalDate releaseDate;

    // Physical Description
    private String height;
    private String weight;
    private String eyeColor;
    private String hairColor;
    private String identifyingMarks;
    private String tattoos;

    // Medical Information
    private String[] medicalConditions;
    private String[] allergies;
    private String[] medications;
    private String bloodType;

    // Risk Assessment
    private String riskLevel;
    private String[] riskHistory;
    private Boolean gangAffiliation;
    private String gangName;
    private Boolean violentHistory;
    private Boolean escapeRisk;
    private Boolean suicideRisk;

    // Status
    private InmateStatus status;

    // Media
    private String photoUrl;
    private String fingerprintsUrl;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private String updatedBy;

    // Notes
    private String notes;

    // Statistics
    private Long totalIncidents;
    private Long totalVisits;
}
