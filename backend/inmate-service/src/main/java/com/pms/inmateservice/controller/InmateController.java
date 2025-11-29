package com.pms.inmateservice.controller;

import com.pms.inmateservice.dto.*;
import com.pms.inmateservice.service.InmateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/inmates")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Inmate Management", description = "APIs for managing inmates in the prison system")
public class InmateController {

    private final InmateService inmateService;

    @PostMapping
    @Operation(summary = "Create new inmate", description = "Register a new inmate in the system")
    public ResponseEntity<InmateResponseDTO> createInmate(@Valid @RequestBody InmateRequestDTO requestDTO) {
        log.info("REST request to create inmate: {}", requestDTO.getBookingNumber());
        InmateResponseDTO response = inmateService.createInmate(requestDTO);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get inmate by ID", description = "Retrieve detailed information about an inmate by their ID")
    public ResponseEntity<InmateResponseDTO> getInmateById(@PathVariable Long id) {
        log.info("REST request to get inmate with ID: {}", id);
        InmateResponseDTO response = inmateService.getInmateById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/booking/{bookingNumber}")
    @Operation(summary = "Get inmate by booking number", description = "Retrieve inmate information by booking number")
    public ResponseEntity<InmateResponseDTO> getInmateByBookingNumber(@PathVariable String bookingNumber) {
        log.info("REST request to get inmate with booking number: {}", bookingNumber);
        InmateResponseDTO response = inmateService.getInmateByBookingNumber(bookingNumber);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    @Operation(summary = "Get all inmates", description = "Retrieve all inmates in the system")
    public ResponseEntity<List<InmateResponseDTO>> getAllInmates() {
        log.info("REST request to get all inmates");
        List<InmateResponseDTO> inmates = inmateService.getAllInmates();
        return ResponseEntity.ok(inmates);
    }

    @GetMapping("/search")
    @Operation(summary = "Search inmates", description = "Search inmates by name, booking number, or NIC")
    public ResponseEntity<List<InmateResponseDTO>> searchInmates(@RequestParam String searchTerm) {
        log.info("REST request to search inmates with term: {}", searchTerm);
        List<InmateResponseDTO> inmates = inmateService.searchInmates(searchTerm);
        return ResponseEntity.ok(inmates);
    }

    @PostMapping("/filter")
    @Operation(summary = "Filter inmates", description = "Filter inmates by various criteria")
    public ResponseEntity<List<InmateResponseDTO>> filterInmates(@RequestBody InmateFilterDTO filter) {
        log.info("REST request to filter inmates");
        List<InmateResponseDTO> inmates = inmateService.filterInmates(filter);
        return ResponseEntity.ok(inmates);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update inmate", description = "Update inmate information")
    public ResponseEntity<InmateResponseDTO> updateInmate(
            @PathVariable Long id,
            @Valid @RequestBody InmateRequestDTO requestDTO) {
        log.info("REST request to update inmate with ID: {}", id);
        InmateResponseDTO response = inmateService.updateInmate(id, requestDTO);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete inmate", description = "Delete an inmate from the system")
    public ResponseEntity<Void> deleteInmate(@PathVariable Long id) {
        log.info("REST request to delete inmate with ID: {}", id);
        inmateService.deleteInmate(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/release")
    @Operation(summary = "Release inmate", description = "Mark an inmate as released")
    public ResponseEntity<InmateResponseDTO> releaseInmate(@PathVariable Long id) {
        log.info("REST request to release inmate with ID: {}", id);
        InmateResponseDTO response = inmateService.releaseInmate(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/transfer")
    @Operation(summary = "Transfer inmate", description = "Transfer an inmate to a different facility or cell")
    public ResponseEntity<InmateResponseDTO> transferInmate(
            @PathVariable Long id,
            @RequestParam String newFacility,
            @RequestParam(required = false) String newBlock,
            @RequestParam(required = false) String newCell) {
        log.info("REST request to transfer inmate {} to facility: {}", id, newFacility);
        InmateResponseDTO response = inmateService.transferInmate(id, newFacility, newBlock, newCell);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/upcoming-releases")
    @Operation(summary = "Get upcoming releases", description = "Get inmates scheduled for release in the next N days")
    public ResponseEntity<List<InmateResponseDTO>> getUpcomingReleases(
            @RequestParam(defaultValue = "30") int days) {
        log.info("REST request to get upcoming releases in next {} days", days);
        List<InmateResponseDTO> inmates = inmateService.getUpcomingReleases(days);
        return ResponseEntity.ok(inmates);
    }

    @GetMapping("/parole-eligible")
    @Operation(summary = "Get parole eligible inmates", description = "Get inmates eligible for parole in the next N days")
    public ResponseEntity<List<InmateResponseDTO>> getParoleEligible(
            @RequestParam(defaultValue = "30") int days) {
        log.info("REST request to get parole eligible inmates in next {} days", days);
        List<InmateResponseDTO> inmates = inmateService.getParoleEligible(days);
        return ResponseEntity.ok(inmates);
    }

    @GetMapping("/high-risk")
    @Operation(summary = "Get high-risk inmates", description = "Get inmates classified as high-risk")
    public ResponseEntity<List<InmateResponseDTO>> getHighRiskInmates() {
        log.info("REST request to get high-risk inmates");
        List<InmateResponseDTO> inmates = inmateService.getHighRiskInmates();
        return ResponseEntity.ok(inmates);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponse> handleRuntimeException(RuntimeException ex) {
        log.error("Error processing request", ex);
        ErrorResponse error = new ErrorResponse(ex.getMessage(), HttpStatus.BAD_REQUEST.value());
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception ex) {
        log.error("Unexpected error", ex);
        ErrorResponse error = new ErrorResponse("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR.value());
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Error response class
    public static class ErrorResponse {
        private String message;
        private int status;

        public ErrorResponse(String message, int status) {
            this.message = message;
            this.status = status;
        }

        public String getMessage() {
            return message;
        }

        public int getStatus() {
            return status;
        }
    }
}
