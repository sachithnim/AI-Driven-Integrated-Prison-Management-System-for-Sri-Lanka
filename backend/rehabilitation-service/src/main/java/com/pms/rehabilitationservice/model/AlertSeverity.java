package com.pms.rehabilitationservice.model;

public enum AlertSeverity {
    WARNING, // Distance from center > 80% of radius
    CRITICAL // Distance from center > 100% of radius (outside boundary)
}
