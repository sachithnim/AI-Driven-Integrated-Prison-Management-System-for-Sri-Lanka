package com.pms.inmateservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmergencyContactDTO {

    private Long id;

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Relationship is required")
    private String relationship;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    private String alternatePhone;
    private String email;
    private String address;
    private Boolean isPrimary;
    private String notes;
}
