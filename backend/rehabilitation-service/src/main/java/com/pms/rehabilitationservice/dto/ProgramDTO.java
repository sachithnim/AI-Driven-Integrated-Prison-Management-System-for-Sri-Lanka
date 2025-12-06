package com.pms.rehabilitationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProgramDTO {
    private Long id;
    private String name;
    private String type;
    private Integer durationWeeks;
    private List<String> requiredSkills;
    private Integer capacity;
    private Integer currentEnrollment;
    private String description;
}
