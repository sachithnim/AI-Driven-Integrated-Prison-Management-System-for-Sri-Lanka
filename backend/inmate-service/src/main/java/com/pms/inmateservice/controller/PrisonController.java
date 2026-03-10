package com.pms.inmateservice.controller;

import com.pms.inmateservice.model.Prison;
import com.pms.inmateservice.model.PrisonType;
import com.pms.inmateservice.model.SecurityLevel;
import com.pms.inmateservice.service.PrisonService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/prisons")
@RequiredArgsConstructor
public class PrisonController {

    private final PrisonService prisonService;

    @GetMapping
    public List<Prison> getAllPrisons() {
        return prisonService.getAllPrisons();
    }

    @GetMapping("/active")
    public List<Prison> getActivePrisons() {
        return prisonService.getActivePrisons();
    }

    @GetMapping("/{id}")
    public Prison getPrisonById(@PathVariable Long id) {
        return prisonService.getPrisonById(id);
    }

    @GetMapping("/code/{code}")
    public Prison getPrisonByCode(@PathVariable String code) {
        return prisonService.getPrisonByCode(code);
    }

    @GetMapping("/type/{type}")
    public List<Prison> getPrisonsByType(@PathVariable PrisonType type) {
        return prisonService.getPrisonsByType(type);
    }

    @GetMapping("/available")
    public List<Prison> getAvailablePrisons(
            @RequestParam(required = false) SecurityLevel securityLevel) {
        if (securityLevel != null) {
            return prisonService.getAvailableBySecurityLevel(securityLevel);
        }
        return prisonService.getAvailablePrisons();
    }

    @PostMapping
    public Prison createPrison(@RequestBody Prison prison) {
        return prisonService.createPrison(prison);
    }

    @PutMapping("/{id}")
    public Prison updatePrison(@PathVariable Long id, @RequestBody Prison prison) {
        return prisonService.updatePrison(id, prison);
    }

    @PatchMapping("/{id}/population")
    public ResponseEntity<Map<String, Object>> updatePopulation(
            @PathVariable Long id,
            @RequestParam int change) {
        prisonService.updatePopulation(id, change);
        double occupancy = prisonService.getOccupancyRate(id);
        return ResponseEntity.ok(Map.of(
                "prisonId", id,
                "change", change,
                "occupancyRate", occupancy));
    }

    @GetMapping("/{id}/occupancy")
    public ResponseEntity<Map<String, Object>> getOccupancy(@PathVariable Long id) {
        Prison prison = prisonService.getPrisonById(id);
        double rate = prisonService.getOccupancyRate(id);
        return ResponseEntity.ok(Map.of(
                "prisonId", id,
                "name", prison.getName(),
                "currentPopulation", prison.getCurrentPopulation(),
                "totalCapacity", prison.getTotalCapacity(),
                "occupancyRate", rate));
    }
}
