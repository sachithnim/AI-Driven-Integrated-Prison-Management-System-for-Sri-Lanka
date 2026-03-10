package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "gps_locations", indexes = {
        @Index(name = "idx_gps_home_leave", columnList = "homeLeaveId"),
        @Index(name = "idx_gps_inmate", columnList = "inmateId"),
        @Index(name = "idx_gps_recorded_at", columnList = "recordedAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GPSLocation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long homeLeaveId; // FK reference to home_leaves.id (maintained at service layer)

    @Column(nullable = false)
    private String inmateId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private Double accuracy; // meters

    private Double speedKmh;

    private String deviceId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime recordedAt;

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }
}
