package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "medical_officers")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MedicalOfficer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String officerId;
    
    @Column(nullable = false)
    private String name;
    
    @ElementCollection
    @CollectionTable(name = "officer_specializations", joinColumns = @JoinColumn(name = "officer_id"))
    @Column(name = "specialization")
    private List<String> specializations;
    
    private Long assignedStationId;
    
    private Integer currentLoad = 0;
    
    private Integer maxCapacity = 10;
    
    private Double successRate = 0.0;
    
    private Boolean active = true;
}
