package com.pms.inmateservice.dto;

import com.pms.inmateservice.model.InmateStatus;
import com.pms.inmateservice.model.SecurityLevel;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InmateFilterDTO {

    private String searchTerm;
    private InmateStatus status;
    private SecurityLevel securityLevel;
    private String currentFacility;
    private String block;
    private LocalDate admissionDateFrom;
    private LocalDate admissionDateTo;
    private LocalDate releaseDateFrom;
    private LocalDate releaseDateTo;
    private Boolean gangAffiliation;
    private Boolean highRisk;
}
