package com.pms.rehabilitationservice.controller;

import com.pms.rehabilitationservice.model.LicenseRelease;
import com.pms.rehabilitationservice.model.LicenseReleaseStatus;
import com.pms.rehabilitationservice.repository.LicenseReleaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rehabilitation/license-release")
@RequiredArgsConstructor
public class LicenseReleaseController {

    private final LicenseReleaseRepository licenseReleaseRepository;

    @PostMapping
    public ResponseEntity<LicenseRelease> create(@RequestBody LicenseRelease request) {
        request.setStatus(LicenseReleaseStatus.PENDING);
        return ResponseEntity.ok(licenseReleaseRepository.save(request));
    }

    @GetMapping
    public List<LicenseRelease> getAll() {
        return licenseReleaseRepository.findAll();
    }

    @GetMapping("/active")
    public List<LicenseRelease> getActive() {
        return licenseReleaseRepository.findByStatusIn(
                List.of(LicenseReleaseStatus.APPROVED, LicenseReleaseStatus.ACTIVE));
    }

    @GetMapping("/{id}")
    public LicenseRelease getById(@PathVariable Long id) {
        return licenseReleaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("License release not found: " + id));
    }

    @GetMapping("/inmate/{inmateId}")
    public List<LicenseRelease> getByInmate(@PathVariable String inmateId) {
        return licenseReleaseRepository.findByInmateId(inmateId);
    }

    @PutMapping("/{id}/approve")
    public LicenseRelease approve(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String officerId) {
        LicenseRelease lr = getById(id);
        lr.setStatus(LicenseReleaseStatus.APPROVED);
        lr.setApprovedBy(officerId);
        return licenseReleaseRepository.save(lr);
    }

    @PutMapping("/{id}/activate")
    public LicenseRelease activate(@PathVariable Long id) {
        LicenseRelease lr = getById(id);
        lr.setStatus(LicenseReleaseStatus.ACTIVE);
        return licenseReleaseRepository.save(lr);
    }

    @PutMapping("/{id}/complete")
    public LicenseRelease complete(@PathVariable Long id) {
        LicenseRelease lr = getById(id);
        lr.setStatus(LicenseReleaseStatus.COMPLETED);
        return licenseReleaseRepository.save(lr);
    }

    @PutMapping("/{id}/revoke")
    public LicenseRelease revoke(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String officerId,
            @RequestParam(required = false) String reason) {
        LicenseRelease lr = getById(id);
        lr.setStatus(LicenseReleaseStatus.REVOKED);
        lr.setViolated(true);
        lr.setRevocationReason(reason);
        return licenseReleaseRepository.save(lr);
    }
}
