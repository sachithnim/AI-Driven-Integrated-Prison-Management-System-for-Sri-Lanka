package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "work_releases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String inmateId;

    @Column(nullable = false)
    private String employerName;

    @Column(nullable = false)
    private String workLocation;

    @Column(length = 100)
    private String workType; // Agriculture, Industry, Construction, Government

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkReleaseStatus status = WorkReleaseStatus.PENDING;

    private Double totalEarnings;

    private String approvedBy;

    @Column(columnDefinition = "TEXT")
    private String conditions;

    private Boolean gpsRequired = false;

    // GPS tracking fields
    private Double lastKnownLat;
    private Double lastKnownLng;
    private LocalDateTime lastLocationUpdate;

    // Geofence
    private Double geofenceCenterLat;
    private Double geofenceCenterLng;
    private Double geofenceRadiusMeters;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
