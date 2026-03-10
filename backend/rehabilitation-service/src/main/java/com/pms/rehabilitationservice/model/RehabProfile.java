package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "rehab_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RehabProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String inmateId;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> profileFeatures;

    /**
     * AI-computed eligibility factor values (0-1 scale).
     * Keys mirror the AI service's factor registry.
     * Updated automatically after each counseling note and progress log.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Double> factorValues;

    private String suitabilityGroup; // e.g., drug_rehab, PTSD, vocational
    
    private Double riskScore;

    /** Running average of counseling session scores (0-10) */
    private Double avgCounselingScore;

    /** Latest progress percentage from the most recent ProgressLog */
    private Integer latestProgressPercentage;

    /** Latest eligibility score (0-1) from the most recent assessment */
    private Double latestEligibilityScore;

    /** Total counseling sessions recorded */
    private Integer totalCounselingSessions;

    /** Total progress logs recorded */
    private Integer totalProgressLogs;
    
    private String mentalHealthStatus;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(nullable = false)
    private LocalDateTime lastUpdated;
    
    @Column(nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
