package com.pms.inmateservice.dto;

import com.pms.inmateservice.model.IncidentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class BehaviorIncidentDTO {

    private Long id;

    @NotBlank(message = "Incident number is required")
    private String incidentNumber;

    @NotNull(message = "Incident type is required")
    private IncidentType incidentType;

    @NotNull(message = "Incident date is required")
    private LocalDateTime incidentDate;

    @NotBlank(message = "Location is required")
    private String location;

    @NotBlank(message = "Description is required")
    private String description;

    private String severity;
    private String reportedBy;
    private String witnessOfficer;
    private String actionTaken;
    private String disciplinaryAction;
    private Boolean resolved;
    private LocalDateTime resolvedDate;
    private String resolvedBy;
    private String notes;
}
