package com.pms.rehabilitationservice.model;

public enum HomeLeaveStatus {
    PENDING,    // Requested, awaiting approval
    APPROVED,   // Approved but leave has not yet started
    ACTIVE,     // Currently on home leave
    COMPLETED,  // Leave period ended successfully
    REVOKED,    // Revoked by prison authority
    DENIED      // Request denied
}
