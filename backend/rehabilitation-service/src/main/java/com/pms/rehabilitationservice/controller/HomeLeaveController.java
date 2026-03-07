package com.pms.rehabilitationservice.controller;

import com.pms.rehabilitationservice.dto.GPSUpdateRequest;
import com.pms.rehabilitationservice.dto.HomeLeaveRequest;
import com.pms.rehabilitationservice.dto.HomeLeaveResponse;
import com.pms.rehabilitationservice.model.GPSLocation;
import com.pms.rehabilitationservice.service.HomeLeaveService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rehabilitation/home-leave")
@RequiredArgsConstructor
@Tag(name = "Home Leave", description = "Home Leave Management & GPS Tracking APIs")
public class HomeLeaveController {

    private final HomeLeaveService homeLeaveService;

    // ── Home Leave CRUD ───────────────────────────────────────────────────────

    @PostMapping
    @Operation(summary = "Submit a home leave request")
    public ResponseEntity<HomeLeaveResponse> requestHomeLeave(@RequestBody HomeLeaveRequest request) {
        return ResponseEntity.ok(homeLeaveService.requestHomeLeave(request));
    }

    @GetMapping
    @Operation(summary = "Get all home leave records")
    public ResponseEntity<List<HomeLeaveResponse>> getAllHomeLeaves() {
        return ResponseEntity.ok(homeLeaveService.getAllHomeLeaves());
    }

    @GetMapping("/active")
    @Operation(summary = "Get all currently active home leaves")
    public ResponseEntity<List<HomeLeaveResponse>> getActiveHomeLeaves() {
        return ResponseEntity.ok(homeLeaveService.getActiveHomeLeaves());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a single home leave record by ID")
    public ResponseEntity<HomeLeaveResponse> getHomeLeaveById(@PathVariable Long id) {
        return ResponseEntity.ok(homeLeaveService.getHomeLeaveById(id));
    }

    @GetMapping("/inmate/{inmateId}")
    @Operation(summary = "Get all home leave records for an inmate")
    public ResponseEntity<List<HomeLeaveResponse>> getHomeLeavesByInmate(@PathVariable String inmateId) {
        return ResponseEntity.ok(homeLeaveService.getHomeLeavesByInmate(inmateId));
    }

    // ── Status Transitions ───────────────────────────────────────────────────

    @PutMapping("/{id}/approve")
    @Operation(summary = "Approve a pending home leave request")
    public ResponseEntity<HomeLeaveResponse> approveHomeLeave(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "admin") String officerId,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(homeLeaveService.approveHomeLeave(id, officerId, notes));
    }

    @PutMapping("/{id}/deny")
    @Operation(summary = "Deny a pending home leave request")
    public ResponseEntity<HomeLeaveResponse> denyHomeLeave(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "admin") String officerId,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(homeLeaveService.denyHomeLeave(id, officerId, notes));
    }

    @PutMapping("/{id}/activate")
    @Operation(summary = "Mark an approved home leave as active (inmate has departed)")
    public ResponseEntity<HomeLeaveResponse> activateHomeLeave(@PathVariable Long id) {
        return ResponseEntity.ok(homeLeaveService.activateHomeLeave(id));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Mark an active home leave as completed (inmate returned)")
    public ResponseEntity<HomeLeaveResponse> completeHomeLeave(@PathVariable Long id) {
        return ResponseEntity.ok(homeLeaveService.completeHomeLeave(id));
    }

    @PutMapping("/{id}/revoke")
    @Operation(summary = "Revoke a home leave (emergency recall)")
    public ResponseEntity<HomeLeaveResponse> revokeHomeLeave(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "admin") String officerId,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(homeLeaveService.revokeHomeLeave(id, officerId, notes));
    }

    // ── GPS Tracking ─────────────────────────────────────────────────────────

    @PostMapping("/{id}/gps")
    @Operation(summary = "Push a GPS position update for an active home leave")
    public ResponseEntity<Map<String, Object>> updateGPSLocation(
            @PathVariable Long id,
            @RequestBody GPSUpdateRequest request) {
        return ResponseEntity.ok(homeLeaveService.updateGPSLocation(id, request));
    }

    @GetMapping("/{id}/gps/history")
    @Operation(summary = "Get full GPS track history for a home leave")
    public ResponseEntity<List<GPSLocation>> getGPSHistory(@PathVariable Long id) {
        return ResponseEntity.ok(homeLeaveService.getGPSHistory(id));
    }
}
