package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StationDTO {
    private Long id;
    private String name;
    private String location;
    private String zone;
    private Integer capacity;
    private Integer currentLoad;
    private List<String> specializations;
    private Double successRate;
}
