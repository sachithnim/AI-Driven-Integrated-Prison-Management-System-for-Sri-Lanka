package com.pms.inmateservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "behavior_incidents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BehaviorIncident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inmate_id", nullable = false)
    private Inmate inmate;

    @Column(nullable = false, unique = true, length = 50)
    private String incidentNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IncidentType incidentType;

    @Column(nullable = false)
    private LocalDateTime incidentDate;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String severity; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(length = 100)
    private String reportedBy;

    @Column(length = 100)
    private String witnessOfficer;

    @Column(columnDefinition = "TEXT")
    private String actionTaken;

    @Column(columnDefinition = "TEXT")
    private String disciplinaryAction;

    private Boolean resolved = false;

    private LocalDateTime resolvedDate;

    @Column(length = 100)
    private String resolvedBy;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
