package com.pms.inmateservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CellDTO {
    private String block;
    private String cellNumber;
    private int capacity;
    private long currentCount;
}
