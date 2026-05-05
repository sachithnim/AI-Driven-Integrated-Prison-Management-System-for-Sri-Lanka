package com.pms.inmateservice.controller;

import com.pms.inmateservice.dto.*;
import com.pms.inmateservice.service.ImageAnalysisService;
import com.pms.inmateservice.service.InmateService;
import com.pms.inmateservice.service.ImageUploadService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/inmates")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Inmate Management", description = "APIs for managing inmates in the prison system")
public class InmateController {

    private final InmateService inmateService;
    private final ImageUploadService imageUploadService;
    private final ImageAnalysisService imageAnalysisService;

    @PostMapping
    @Operation(summary = "Create new inmate", description = "Register a new inmate in the system")
    public ResponseEntity<InmateResponseDTO> createInmate(@Valid @RequestBody InmateRequestDTO requestDTO) {
        log.info("REST request to create inmate: {} {}", requestDTO.getFirstName(), requestDTO.getLastName());
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

    @PostMapping("/{id}/run-ai-assessment")
    @Operation(summary = "Run AI Initial Assessment", description = "Explicitly run the AI scoring for behavior, discipline, and risk to update pending scores")
    public ResponseEntity<InmateResponseDTO> runAiInitialAssessment(@PathVariable Long id) {
        log.info("REST request to run AI initial assessment for inmate ID: {}", id);
        InmateResponseDTO response = inmateService.runAiInitialAssessment(id);
        return ResponseEntity.ok(response);
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

    @PostMapping(value = "/extract-physical-description", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Extract physical description from images", description = "Use AI to infer physical description fields from close face and full body photos")
    public ResponseEntity<PhysicalDescriptionAnalysisDTO> extractPhysicalDescription(
            @RequestParam(value = "closeFaceImage", required = false) MultipartFile closeFaceImage,
            @RequestParam(value = "fullBodyImage", required = false) MultipartFile fullBodyImage) {
        log.info("REST request to extract physical description from inmate images");
        PhysicalDescriptionAnalysisDTO analysis = imageAnalysisService.extractPhysicalDescription(closeFaceImage, fullBodyImage);
        return ResponseEntity.ok(analysis);
    }

    @PostMapping("/{id}/upload-image")
    @Operation(summary = "Upload inmate image", description = "Upload close face or full body image for an inmate")
    public ResponseEntity<Map<String, String>> uploadImage(
            @PathVariable Long id,
            @RequestParam MultipartFile file,
            @RequestParam String imageType) {
        try {
            log.info("REST request to upload {} image for inmate: {}", imageType, id);
            String imagePath = imageUploadService.uploadImage(file, id, imageType);
            inmateService.updateInmateImage(id, imageType, imagePath);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Image uploaded successfully");
            response.put("imagePath", imagePath);
            response.put("imageType", imageType);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            log.error("Error uploading image", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to upload image: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }
    }

    @GetMapping("/{id}/image/{imageType}")
    @Operation(summary = "Get inmate image", description = "Retrieve close face or full body image for an inmate")
    public ResponseEntity<byte[]> getImage(@PathVariable Long id, @PathVariable String imageType) {
        try {
            log.info("REST request to get {} image for inmate: {}", imageType, id);
            InmateResponseDTO inmate = inmateService.getInmateById(id);
            String imagePath = null;
            
            if ("closeFace".equals(imageType)) {
                imagePath = inmate.getCloseFaceImagePath();
            } else if ("fullBody".equals(imageType)) {
                imagePath = inmate.getFullBodyImagePath();
            }
            
            if (imagePath == null || imagePath.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            byte[] imageData = imageUploadService.getImage(imagePath);
            return ResponseEntity.ok()
                    .header("Content-Type", "image/jpeg")
                    .body(imageData);
        } catch (IOException e) {
            log.error("Error retrieving image", e);
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}/image/{imageType}")
    @Operation(summary = "Delete inmate image", description = "Delete close face or full body image for an inmate")
    public ResponseEntity<Map<String, String>> deleteImage(@PathVariable Long id, @PathVariable String imageType) {
        try {
            log.info("REST request to delete {} image for inmate: {}", imageType, id);
            InmateResponseDTO inmate = inmateService.getInmateById(id);
            String imagePath = null;
            
            if ("closeFace".equals(imageType)) {
                imagePath = inmate.getCloseFaceImagePath();
            } else if ("fullBody".equals(imageType)) {
                imagePath = inmate.getFullBodyImagePath();
            }
            
            if (imagePath != null && !imagePath.isEmpty()) {
                imageUploadService.deleteImage(imagePath);
                inmateService.updateInmateImage(id, imageType, null);
            }
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Image deleted successfully");
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            log.error("Error deleting image", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete image: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        }
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
