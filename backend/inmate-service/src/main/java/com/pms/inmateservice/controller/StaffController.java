package com.pms.inmateservice.controller;

import com.pms.inmateservice.model.Staff;
import com.pms.inmateservice.repository.StaffRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/staff")
@RequiredArgsConstructor
@Tag(name = "Staff", description = "Staff Management APIs")
public class StaffController {

    private final StaffRepository staffRepository;

    @GetMapping
    @Operation(summary = "Get all staff", description = "Get list of all staff members")
    public ResponseEntity<List<Staff>> getAllStaff() {
        return ResponseEntity.ok(staffRepository.findAll());
    }

    @GetMapping("/role/{role}")
    @Operation(summary = "Get staff by role", description = "Get list of staff by specific role")
    public ResponseEntity<List<Staff>> getStaffByRole(@PathVariable String role) {
        return ResponseEntity.ok(staffRepository.findByRole(role));
    }

    @PostMapping
    @Operation(summary = "Create staff", description = "Create a new staff member")
    public ResponseEntity<Staff> createStaff(@RequestBody Staff staff) {
        return ResponseEntity.ok(staffRepository.save(staff));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete staff", description = "Delete a staff member")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
