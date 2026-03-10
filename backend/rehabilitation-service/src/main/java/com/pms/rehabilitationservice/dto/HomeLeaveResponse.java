package com.pms.rehabilitationservice.dto;

import com.pms.rehabilitationservice.model.HomeLeaveStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class HomeLeaveResponse {
    private Long id;
    private String inmateId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private HomeLeaveStatus status;
    private String reason;
    private String approvedBy;
    private String conditions;
    private String destinationAddress;
    private String contactPhone;
    private Boolean gpsRequired;
    private Double lastKnownLat;
    private Double lastKnownLng;
    private LocalDateTime lastLocationUpdate;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Convenience helpers
    private long durationDays;
    private boolean isActive;
}
