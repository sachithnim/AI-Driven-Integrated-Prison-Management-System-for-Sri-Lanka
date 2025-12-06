package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "programs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Program {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String type; // substance_abuse, mental_health, vocational, education
    
    private Integer durationWeeks;
    
    @ElementCollection
    @CollectionTable(name = "program_required_skills", joinColumns = @JoinColumn(name = "program_id"))
    @Column(name = "skill")
    private List<String> requiredSkills;
    
    private Integer capacity;
    
    private Integer currentEnrollment = 0;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    private Boolean active = true;
}
