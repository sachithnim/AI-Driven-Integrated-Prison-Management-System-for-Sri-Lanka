package com.pms.rehabilitationservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "license_releases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LicenseRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String inmateId;

    @Column(nullable = false)
    private LocalDateTime releaseDate;

    @Column(nullable = false)
    private LocalDateTime licenseExpiryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LicenseReleaseStatus status = LicenseReleaseStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String conditions;

    private String supervisorId;

    private String supervisorName;

    private String supervisorContact;

    private Boolean violated = false;

    @Column(columnDefinition = "TEXT")
    private String revocationReason;

    private String approvedBy;

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
