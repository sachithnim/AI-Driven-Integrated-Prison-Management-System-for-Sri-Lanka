package com.pms.rehabilitationservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class HomeLeaveRequest {
    private String inmateId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String reason;
    private String destinationAddress;
    private String contactPhone;
    private String conditions;
    private Boolean gpsRequired = true;
    private String requestedBy; // officer ID making the request
    // Geofence settings
    private Double geofenceCenterLat;
    private Double geofenceCenterLng;
    private Double geofenceRadiusMeters;
}
