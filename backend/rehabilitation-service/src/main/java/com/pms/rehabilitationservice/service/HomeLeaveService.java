package com.pms.rehabilitationservice.service;

import com.pms.rehabilitationservice.dto.GPSUpdateRequest;
import com.pms.rehabilitationservice.dto.HomeLeaveRequest;
import com.pms.rehabilitationservice.dto.HomeLeaveResponse;
import com.pms.rehabilitationservice.model.GPSLocation;
import com.pms.rehabilitationservice.model.HomeLeave;
import com.pms.rehabilitationservice.model.HomeLeaveStatus;
import com.pms.rehabilitationservice.repository.GPSLocationRepository;
import com.pms.rehabilitationservice.repository.HomeLeaveRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class HomeLeaveService {

    private final HomeLeaveRepository homeLeaveRepository;
    private final GPSLocationRepository gpsLocationRepository;

    // ── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional
    public HomeLeaveResponse requestHomeLeave(HomeLeaveRequest req) {
        HomeLeave leave = new HomeLeave();
        leave.setInmateId(req.getInmateId());
        leave.setStartDate(req.getStartDate());
        leave.setEndDate(req.getEndDate());
        leave.setReason(req.getReason());
        leave.setDestinationAddress(req.getDestinationAddress());
        leave.setContactPhone(req.getContactPhone());
        leave.setConditions(req.getConditions());
        leave.setGpsRequired(req.getGpsRequired() != null ? req.getGpsRequired() : true);
        leave.setStatus(HomeLeaveStatus.PENDING);
        return toResponse(homeLeaveRepository.save(leave));
    }

    @Transactional
    public HomeLeaveResponse approveHomeLeave(Long id, String officerId, String notes) {
        HomeLeave leave = findOrThrow(id);
        if (leave.getStatus() != HomeLeaveStatus.PENDING) {
            throw new IllegalStateException("Only PENDING home leave requests can be approved");
        }
        leave.setStatus(HomeLeaveStatus.APPROVED);
        leave.setApprovedBy(officerId);
        if (notes != null) leave.setNotes(notes);
        return toResponse(homeLeaveRepository.save(leave));
    }

    @Transactional
    public HomeLeaveResponse denyHomeLeave(Long id, String officerId, String notes) {
        HomeLeave leave = findOrThrow(id);
        if (leave.getStatus() != HomeLeaveStatus.PENDING) {
            throw new IllegalStateException("Only PENDING home leave requests can be denied");
        }
        leave.setStatus(HomeLeaveStatus.DENIED);
        leave.setApprovedBy(officerId);
        if (notes != null) leave.setNotes(notes);
        return toResponse(homeLeaveRepository.save(leave));
    }

    @Transactional
    public HomeLeaveResponse activateHomeLeave(Long id) {
        HomeLeave leave = findOrThrow(id);
        if (leave.getStatus() != HomeLeaveStatus.APPROVED) {
            throw new IllegalStateException("Only APPROVED home leave can be activated");
        }
        leave.setStatus(HomeLeaveStatus.ACTIVE);
        return toResponse(homeLeaveRepository.save(leave));
    }

    @Transactional
    public HomeLeaveResponse completeHomeLeave(Long id) {
        HomeLeave leave = findOrThrow(id);
        if (leave.getStatus() != HomeLeaveStatus.ACTIVE) {
            throw new IllegalStateException("Only ACTIVE home leave can be completed");
        }
        leave.setStatus(HomeLeaveStatus.COMPLETED);
        return toResponse(homeLeaveRepository.save(leave));
    }

    @Transactional
    public HomeLeaveResponse revokeHomeLeave(Long id, String officerId, String notes) {
        HomeLeave leave = findOrThrow(id);
        if (leave.getStatus() == HomeLeaveStatus.COMPLETED
                || leave.getStatus() == HomeLeaveStatus.REVOKED
                || leave.getStatus() == HomeLeaveStatus.DENIED) {
            throw new IllegalStateException("Cannot revoke a leave with status: " + leave.getStatus());
        }
        leave.setStatus(HomeLeaveStatus.REVOKED);
        leave.setApprovedBy(officerId);
        if (notes != null) leave.setNotes(notes);
        return toResponse(homeLeaveRepository.save(leave));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<HomeLeaveResponse> getHomeLeavesByInmate(String inmateId) {
        return homeLeaveRepository.findByInmateIdOrderByCreatedAtDesc(inmateId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<HomeLeaveResponse> getActiveHomeLeaves() {
        return homeLeaveRepository.findByStatus(HomeLeaveStatus.ACTIVE)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<HomeLeaveResponse> getAllHomeLeaves() {
        return homeLeaveRepository.findAll()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public HomeLeaveResponse getHomeLeaveById(Long id) {
        return toResponse(findOrThrow(id));
    }

    // ── GPS ───────────────────────────────────────────────────────────────────

    @Transactional
    public Map<String, Object> updateGPSLocation(Long leaveId, GPSUpdateRequest req) {
        HomeLeave leave = findOrThrow(leaveId);
        if (leave.getStatus() != HomeLeaveStatus.ACTIVE) {
            throw new IllegalStateException("GPS updates only accepted for ACTIVE home leaves");
        }

        // Save history record
        GPSLocation loc = new GPSLocation();
        loc.setHomeLeaveId(leaveId);
        loc.setInmateId(leave.getInmateId());
        loc.setLatitude(req.getLatitude());
        loc.setLongitude(req.getLongitude());
        loc.setAccuracy(req.getAccuracy());
        loc.setSpeedKmh(req.getSpeedKmh());
        loc.setDeviceId(req.getDeviceId());
        gpsLocationRepository.save(loc);

        // Update last known position on the leave record
        leave.setLastKnownLat(req.getLatitude());
        leave.setLastKnownLng(req.getLongitude());
        leave.setLastLocationUpdate(loc.getRecordedAt());
        homeLeaveRepository.save(leave);

        return Map.of(
                "success", true,
                "leaveId", leaveId,
                "latitude", req.getLatitude(),
                "longitude", req.getLongitude(),
                "recordedAt", loc.getRecordedAt().toString()
        );
    }

    public List<GPSLocation> getGPSHistory(Long leaveId) {
        findOrThrow(leaveId); // validate existence
        return gpsLocationRepository.findByHomeLeaveIdOrderByRecordedAtAsc(leaveId);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private HomeLeave findOrThrow(Long id) {
        return homeLeaveRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Home leave not found with id: " + id));
    }

    private HomeLeaveResponse toResponse(HomeLeave h) {
        HomeLeaveResponse r = new HomeLeaveResponse();
        r.setId(h.getId());
        r.setInmateId(h.getInmateId());
        r.setStartDate(h.getStartDate());
        r.setEndDate(h.getEndDate());
        r.setStatus(h.getStatus());
        r.setReason(h.getReason());
        r.setApprovedBy(h.getApprovedBy());
        r.setConditions(h.getConditions());
        r.setDestinationAddress(h.getDestinationAddress());
        r.setContactPhone(h.getContactPhone());
        r.setGpsRequired(h.getGpsRequired());
        r.setLastKnownLat(h.getLastKnownLat());
        r.setLastKnownLng(h.getLastKnownLng());
        r.setLastLocationUpdate(h.getLastLocationUpdate());
        r.setNotes(h.getNotes());
        r.setCreatedAt(h.getCreatedAt());
        r.setUpdatedAt(h.getUpdatedAt());
        r.setActive(h.getStatus() == HomeLeaveStatus.ACTIVE);
        if (h.getStartDate() != null && h.getEndDate() != null) {
            r.setDurationDays(ChronoUnit.DAYS.between(h.getStartDate(), h.getEndDate()));
        }
        return r;
    }
}
