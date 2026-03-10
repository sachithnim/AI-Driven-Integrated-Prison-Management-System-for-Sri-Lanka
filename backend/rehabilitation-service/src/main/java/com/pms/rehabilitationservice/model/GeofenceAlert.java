package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "geofence_alerts", indexes = {
        @Index(name = "idx_alert_home_leave", columnList = "homeLeaveId"),
        @Index(name = "idx_alert_inmate", columnList = "inmateId"),
        @Index(name = "idx_alert_time", columnList = "alertedAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GeofenceAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long homeLeaveId;

    private Long workReleaseId;

    @Column(nullable = false)
    private String inmateId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    private Double distanceFromCenter; // meters

    @Column(nullable = false)
    private Double allowedRadius; // meters

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AlertSeverity severity;

    private Boolean acknowledged = false;

    private String acknowledgedBy;

    private LocalDateTime acknowledgedAt;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false, updatable = false)
    private LocalDateTime alertedAt;

    @PrePersist
    protected void onCreate() {
        alertedAt = LocalDateTime.now();
    }
}
