package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "home_leaves")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomeLeave {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String inmateId;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private HomeLeaveStatus status = HomeLeaveStatus.PENDING;

    @Column(nullable = false)
    private String reason; // reason for home leave request

    private String approvedBy; // officer ID who approved

    @Column(columnDefinition = "TEXT")
    private String conditions; // conditions/restrictions during leave

    private String destinationAddress;

    private String contactPhone;

    private Boolean gpsRequired = true;

    // Geofence boundary settings
    private Double geofenceCenterLat;
    private Double geofenceCenterLng;
    private Double geofenceRadiusMeters; // allowed radius in meters

    // Last known GPS position (updated via GPS endpoint)
    private Double lastKnownLat;

    private Double lastKnownLng;

    private LocalDateTime lastLocationUpdate;

    @Column(columnDefinition = "TEXT")
    private String notes; // officer notes on the leave

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
