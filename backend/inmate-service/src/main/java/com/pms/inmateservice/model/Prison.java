package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prisons")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Prison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 10)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PrisonType type;

    @Column(length = 50)
    private String district;

    @Column(length = 50)
    private String province;

    private Double latitude;

    private Double longitude;

    @Column(nullable = false)
    private Integer totalCapacity;

    private Integer currentPopulation = 0;

    @Enumerated(EnumType.STRING)
    private SecurityLevel securityLevel;

    private Boolean acceptsConvicted = true;

    private Boolean acceptsUnconvicted = true;

    @ElementCollection
    @CollectionTable(name = "prison_available_programs", joinColumns = @JoinColumn(name = "prison_id"))
    @Column(name = "program")
    private List<String> availablePrograms = new ArrayList<>();

    private Boolean active = true;
}
