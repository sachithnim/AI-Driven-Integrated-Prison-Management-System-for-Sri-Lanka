package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "progress_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProgressLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String inmateId;
    
    @ManyToOne
    @JoinColumn(name = "recommendation_id")
    private Recommendation recommendation;
    
    @Column(nullable = false)
    private LocalDateTime logDate;
    
    @Enumerated(EnumType.STRING)
    private ProgressStatus status;
    
    private Integer progressPercentage; // 0-100
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    private String recordedBy; // officer ID
    
    @PrePersist
    protected void onCreate() {
        logDate = LocalDateTime.now();
    }
}
