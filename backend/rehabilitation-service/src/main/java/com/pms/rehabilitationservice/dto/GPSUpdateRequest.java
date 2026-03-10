package com.pms.rehabilitationservice.dto;

import lombok.Data;

@Data
public class GPSUpdateRequest {
    private Double latitude;
    private Double longitude;
    private Double accuracy;  // metres, optional
    private Double speedKmh;  // optional
    private String deviceId;  // optional device identifier
}
