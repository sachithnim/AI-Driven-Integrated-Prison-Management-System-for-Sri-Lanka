package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfficerDTO {
    private Long id;
    private String officerId;
    private String name;
    private List<String> specializations;
    private Long assignedStationId;
    private Integer currentLoad;
    private Integer maxCapacity;
    private Double successRate;
}
