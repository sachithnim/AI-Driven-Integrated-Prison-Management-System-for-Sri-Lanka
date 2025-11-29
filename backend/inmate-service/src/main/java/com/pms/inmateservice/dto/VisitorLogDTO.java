package com.pms.inmateservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class VisitorLogDTO {

    private Long id;

    @NotBlank(message = "Visitor name is required")
    private String visitorName;

    @NotBlank(message = "Relationship is required")
    private String relationship;

    private String visitorId;
    private String contactNumber;

    @NotNull(message = "Visit date is required")
    private LocalDateTime visitDate;

    @NotNull(message = "Check-in time is required")
    private LocalDateTime checkInTime;

    private LocalDateTime checkOutTime;
    private String visitLocation;
    private String visitType;
    private String approvedBy;
    private String notes;
    private Boolean contraband;
    private String contrabandDetails;
}
