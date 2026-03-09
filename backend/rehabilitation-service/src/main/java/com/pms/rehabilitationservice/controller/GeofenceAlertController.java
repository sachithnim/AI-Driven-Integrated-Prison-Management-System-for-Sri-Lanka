package com.pms.rehabilitationservice.controller;

import com.pms.rehabilitationservice.model.GeofenceAlert;
import com.pms.rehabilitationservice.repository.GeofenceAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rehabilitation/geofence-alerts")
@RequiredArgsConstructor
public class GeofenceAlertController {

    private final GeofenceAlertRepository geofenceAlertRepository;

    @GetMapping
    public List<GeofenceAlert> getAll() {
        return geofenceAlertRepository.findAll();
    }

    @GetMapping("/unacknowledged")
    public List<GeofenceAlert> getUnacknowledged() {
        return geofenceAlertRepository.findByAcknowledgedFalse();
    }

    @GetMapping("/inmate/{inmateId}")
    public List<GeofenceAlert> getByInmate(@PathVariable String inmateId) {
        return geofenceAlertRepository.findByInmateId(inmateId);
    }

    @GetMapping("/home-leave/{homeLeaveId}")
    public List<GeofenceAlert> getByHomeLeave(@PathVariable Long homeLeaveId) {
        return geofenceAlertRepository.findByHomeLeaveId(homeLeaveId);
    }

    @PutMapping("/{id}/acknowledge")
    public ResponseEntity<Map<String, Object>> acknowledge(
            @PathVariable Long id,
            @RequestParam(defaultValue = "admin") String officerId,
            @RequestParam(required = false) String notes) {
        GeofenceAlert alert = geofenceAlertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setAcknowledged(true);
        alert.setAcknowledgedBy(officerId);
        alert.setAcknowledgedAt(LocalDateTime.now());
        if (notes != null)
            alert.setNotes(notes);
        geofenceAlertRepository.save(alert);
        return ResponseEntity.ok(Map.of("acknowledged", true, "alertId", id));
    }
}
