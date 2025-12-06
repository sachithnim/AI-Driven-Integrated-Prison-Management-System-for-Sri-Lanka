package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Entity
@Table(name = "rehab_stations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RehabStation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String location;
    
    private String zone; // for proximity matching
    
    private Integer capacity;
    
    private Integer currentLoad = 0;
    
    @ElementCollection
    @CollectionTable(name = "station_specializations", joinColumns = @JoinColumn(name = "station_id"))
    @Column(name = "specialization")
    private List<String> specializations;
    
    private Double successRate = 0.0; // historical success rate
    
    private Boolean active = true;
}
