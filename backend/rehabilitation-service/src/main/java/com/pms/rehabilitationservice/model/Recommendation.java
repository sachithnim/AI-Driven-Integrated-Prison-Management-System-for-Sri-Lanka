package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "recommendations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Recommendation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String inmateId;
    
    @ManyToOne
    @JoinColumn(name = "program_id")
    private Program program;
    
    @ManyToOne
    @JoinColumn(name = "station_id")
    private RehabStation station;
    
    @ManyToOne
    @JoinColumn(name = "officer_id")
    private MedicalOfficer officer;
    
    private Integer recommendedDurationWeeks;
    
    @Column(columnDefinition = "TEXT")
    private String reasonExplainer; // AI-generated explanation
    
    private Double confidence; // 0-1 confidence score
    
    @Enumerated(EnumType.STRING)
    private RecommendationStatus status = RecommendationStatus.PENDING;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime startDate;
    
    private LocalDateTime expectedEndDate;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
