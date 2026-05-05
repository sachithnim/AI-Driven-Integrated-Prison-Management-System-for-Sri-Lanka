package com.pms.inmateservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PhysicalDescriptionAnalysisDTO {
    private String height;
    private String weight;
    private String eyeColor;
    private String hairColor;
    private String identifyingMarks;
    private String tattoos;
}
