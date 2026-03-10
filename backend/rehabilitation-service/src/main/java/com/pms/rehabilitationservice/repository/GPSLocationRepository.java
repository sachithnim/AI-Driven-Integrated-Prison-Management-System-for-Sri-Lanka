package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.GPSLocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GPSLocationRepository extends JpaRepository<GPSLocation, Long> {
    List<GPSLocation> findByHomeLeaveIdOrderByRecordedAtAsc(Long homeLeaveId);
    List<GPSLocation> findByInmateIdOrderByRecordedAtDesc(String inmateId);
    void deleteByHomeLeaveId(Long homeLeaveId);
}
