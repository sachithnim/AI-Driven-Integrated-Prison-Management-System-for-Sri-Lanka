package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "inmates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Inmate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Basic Information
    @Column(nullable = false, length = 100)
    private String firstName;

    @Column(nullable = false, length = 100)
    private String lastName;

    @Column(length = 100)
    private String middleName;

    @Column(nullable = false)
    private LocalDate dateOfBirth;

    @Column(length = 20)
    private String gender;

    @Column(length = 50)
    private String nationality;

    @Column(length = 20)
    private String nic; // National Identity Card

    @Column(length = 500)
    private String address;

    @Column(length = 20)
    private String contactNumber;

    // Demographic & Background Information (for AI assessment)
    @Column(length = 50)
    private String religion; // Buddhist, Hindu, Islam, Roman Catholic, Other Christian, Other

    @Column(length = 50)
    private String maritalStatus; // Never Married, Married, Widowed, Divorced, Legally Separated

    @Column(length = 50)
    private String literacyLevel; // No Schooling, Grade 1-5, Passed Grade 5, Passed Grade 8, GCE O/L, GCE A/L,
                                  // Graduate

    private Integer previousConvictions; // Number of previous convictions (0, 1, 2, 3+)

    @Column(length = 100)
    private String previousPunishments; // None, Warned & Discharged, Fined, Probation, Prison, Remand Custody

    @Column(length = 50)
    private String incomeLevel; // No Income, Below Rs.3000/month, Rs.3000 & Over/month

    @Column(length = 500)
    private String addictions; // JSON: {"alcohol":"excessive","drugs":"moderate","gambling":"not_addicted"}

    @Column(length = 200)
    private String occupation; // Cultivator, Fisherman, Skilled Labour, Unskilled Labour, Driver, Businessman,
                               // etc.

    // Case Information
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ConvictionStatus convictionStatus = ConvictionStatus.UNCONVICTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CaseType caseType;

    @Column(length = 100)
    private String caseNumber;

    @Column(nullable = false)
    private LocalDate sentenceStartDate;

    @Column(nullable = false)
    private LocalDate sentenceEndDate;

    private LocalDate paroleEligibilityDate;

    @Column(nullable = false)
    private Integer sentenceDurationMonths;

    @Column(length = 1000)
    private String crimeDescription;

    @Column(length = 100)
    private String court;

    @Column(length = 100)
    private String judge;

    // Facility Information
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SecurityLevel securityLevel;

    @Column(length = 100)
    private String currentFacility;

    @Column(length = 50)
    private String block;

    @Column(length = 20)
    private String cellNumber;

    @ManyToOne
    @JoinColumn(name = "cell_id")
    private Cell cell;

    // AI Generated Scores
    @Column(name = "behavior_score")
    private Double behaviorScore;

    @Column(name = "discipline_score")
    private Double disciplineScore;

    @Column(name = "risk_score")
    private Double riskScore;

    @Column(length = 2000)
    private String aiReasoning;

    private LocalDate admissionDate;

    private LocalDate releaseDate;

    // Physical Description
    @Column(length = 20)
    private String height;

    @Column(length = 20)
    private String weight;

    @Column(length = 50)
    private String eyeColor;

    @Column(length = 50)
    private String hairColor;

    @Column(length = 1000)
    private String identifyingMarks;

    @Column(length = 500)
    private String tattoos;

    // Medical Information (stored as JSON arrays)
    @Column(columnDefinition = "TEXT[]")
    private String[] medicalConditions;

    @Column(columnDefinition = "TEXT[]")
    private String[] allergies;

    @Column(columnDefinition = "TEXT[]")
    private String[] medications;

    @Column(length = 20)
    private String bloodType;

    // Risk Assessment
    @Column(length = 50)
    private String riskLevel;

    @Column(columnDefinition = "TEXT[]")
    private String[] riskHistory;

    private Boolean gangAffiliation = false;

    @Column(length = 200)
    private String gangName;

    private Boolean violentHistory = false;

    private Boolean escapeRisk = false;

    private Boolean suicideRisk = false;

    // Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InmateStatus status = InmateStatus.ACTIVE;

    // Media
    @Column(length = 500)
    private String photoUrl;

    @Column(length = 500)
    private String fingerprintsUrl;

    // Relationships (One-to-Many)
    @OneToMany(mappedBy = "inmate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmergencyContact> emergencyContacts = new ArrayList<>();

    @OneToMany(mappedBy = "inmate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<VisitorLog> visitorLogs = new ArrayList<>();

    @OneToMany(mappedBy = "inmate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BehaviorIncident> behaviorIncidents = new ArrayList<>();

    @OneToMany(mappedBy = "inmate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<WorkAssignment> workAssignments = new ArrayList<>();

    @OneToMany(mappedBy = "inmate", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EducationProgram> educationPrograms = new ArrayList<>();

    // Audit Fields
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @Column(length = 100)
    private String createdBy;

    @Column(length = 100)
    private String updatedBy;

    // Additional Notes
    @Column(columnDefinition = "TEXT")
    private String notes;

    // Helper methods
    public String getFullName() {
        if (middleName != null && !middleName.isEmpty()) {
            return firstName + " " + middleName + " " + lastName;
        }
        return firstName + " " + lastName;
    }

    public Integer getAge() {
        if (dateOfBirth != null) {
            return LocalDate.now().getYear() - dateOfBirth.getYear();
        }
        return null;
    }

    public Integer getDaysServed() {
        if (sentenceStartDate != null) {
            LocalDate endDate = releaseDate != null ? releaseDate : LocalDate.now();
            return (int) java.time.temporal.ChronoUnit.DAYS.between(sentenceStartDate, endDate);
        }
        return null;
    }

    public Integer getDaysRemaining() {
        if (sentenceEndDate != null && status == InmateStatus.ACTIVE) {
            return (int) java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), sentenceEndDate);
        }
        return null;
    }
}
