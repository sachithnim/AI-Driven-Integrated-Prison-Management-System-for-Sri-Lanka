package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "counseling_notes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CounselingNote {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String inmateId;
    
    private String counselorId;
    
    @Column(nullable = false)
    private LocalDateTime sessionDate;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String text;
    
    private Double sessionScore; // 0-10 rating by counselor
    
    private String sentiment; // AI-derived: positive, negative, neutral
    
    @Column(columnDefinition = "TEXT")
    private String summary; // AI-generated summary
    
    @PrePersist
    protected void onCreate() {
        sessionDate = LocalDateTime.now();
    }
}
