package com.pms.rehabilitationservice.controller;

import com.pms.rehabilitationservice.model.WorkRelease;
import com.pms.rehabilitationservice.model.WorkReleaseStatus;
import com.pms.rehabilitationservice.repository.WorkReleaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/rehabilitation/work-release")
@RequiredArgsConstructor
public class WorkReleaseController {

    private final WorkReleaseRepository workReleaseRepository;

    @PostMapping
    public ResponseEntity<WorkRelease> create(@RequestBody WorkRelease request) {
        request.setStatus(WorkReleaseStatus.PENDING);
        return ResponseEntity.ok(workReleaseRepository.save(request));
    }

    @GetMapping
    public List<WorkRelease> getAll() {
        return workReleaseRepository.findAll();
    }

    @GetMapping("/active")
    public List<WorkRelease> getActive() {
        return workReleaseRepository.findByStatusIn(
                List.of(WorkReleaseStatus.APPROVED, WorkReleaseStatus.ACTIVE));
    }

    @GetMapping("/{id}")
    public WorkRelease getById(@PathVariable Long id) {
        return workReleaseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Work release not found: " + id));
    }

    @GetMapping("/inmate/{inmateId}")
    public List<WorkRelease> getByInmate(@PathVariable String inmateId) {
        return workReleaseRepository.findByInmateId(inmateId);
    }

    @PutMapping("/{id}/approve")
    public WorkRelease approve(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String officerId) {
        WorkRelease wr = getById(id);
        wr.setStatus(WorkReleaseStatus.APPROVED);
        wr.setApprovedBy(officerId);
        return workReleaseRepository.save(wr);
    }

    @PutMapping("/{id}/activate")
    public WorkRelease activate(@PathVariable Long id) {
        WorkRelease wr = getById(id);
        wr.setStatus(WorkReleaseStatus.ACTIVE);
        return workReleaseRepository.save(wr);
    }

    @PutMapping("/{id}/complete")
    public WorkRelease complete(@PathVariable Long id) {
        WorkRelease wr = getById(id);
        wr.setStatus(WorkReleaseStatus.COMPLETED);
        return workReleaseRepository.save(wr);
    }

    @PutMapping("/{id}/revoke")
    public WorkRelease revoke(@PathVariable Long id,
            @RequestParam(defaultValue = "admin") String officerId,
            @RequestParam(required = false) String reason) {
        WorkRelease wr = getById(id);
        wr.setStatus(WorkReleaseStatus.REVOKED);
        wr.setNotes(reason);
        return workReleaseRepository.save(wr);
    }
}
