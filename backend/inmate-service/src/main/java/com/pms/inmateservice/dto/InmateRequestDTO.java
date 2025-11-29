package com.pms.inmateservice.dto;

import com.pms.inmateservice.model.CaseType;
import com.pms.inmateservice.model.InmateStatus;
import com.pms.inmateservice.model.SecurityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InmateRequestDTO {

    @NotBlank(message = "Booking number is required")
    private String bookingNumber;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String middleName;

    @NotNull(message = "Date of birth is required")
    private LocalDate dateOfBirth;

    @NotBlank(message = "Gender is required")
    private String gender;

    private String nationality;
    private String nic;
    private String address;
    private String contactNumber;

    // Case Information
    @NotNull(message = "Case type is required")
    private CaseType caseType;

    private String caseNumber;

    @NotNull(message = "Sentence start date is required")
    private LocalDate sentenceStartDate;

    @NotNull(message = "Sentence end date is required")
    private LocalDate sentenceEndDate;

    private LocalDate paroleEligibilityDate;

    @NotNull(message = "Sentence duration is required")
    private Integer sentenceDurationMonths;

    private String crimeDescription;
    private String court;
    private String judge;

    // Facility Information
    @NotNull(message = "Security level is required")
    private SecurityLevel securityLevel;

    @NotBlank(message = "Current facility is required")
    private String currentFacility;

    private String block;
    private String cellNumber;

    @NotNull(message = "Admission date is required")
    private LocalDate admissionDate;

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

    // Notes
    private String notes;
}
