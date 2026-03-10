package com.pms.inmateservice.model;

/**
 * Sri Lankan prison system distinguishes between convicted and unconvicted
 * prisoners.
 * Per 2024 statistics: 64.7% of prisoners are unconvicted (remand).
 * This status affects eligibility for leave schemes and rehabilitation
 * programs.
 */
public enum ConvictionStatus {
    CONVICTED, // Sentenced by court
    UNCONVICTED, // Awaiting trial / on remand
    APPEAL // Convicted but appealing
}
