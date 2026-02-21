package com.pms.inmateservice.controller;

import com.pms.inmateservice.dto.CellDTO;
import com.pms.inmateservice.repository.InmateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/overcrowding")
@RequiredArgsConstructor
public class OvercrowdingController {

    private final InmateRepository inmateRepository;

    @GetMapping("/cells")
    public ResponseEntity<List<CellDTO>> getCellOccupancy() {
        return ResponseEntity.ok(inmateRepository.getCellOccupancy());
    }
}
