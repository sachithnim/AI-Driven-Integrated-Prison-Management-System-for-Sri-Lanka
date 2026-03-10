package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.GeofenceAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeofenceAlertRepository extends JpaRepository<GeofenceAlert, Long> {
    List<GeofenceAlert> findByInmateId(String inmateId);

    List<GeofenceAlert> findByHomeLeaveId(Long homeLeaveId);

    List<GeofenceAlert> findByWorkReleaseId(Long workReleaseId);

    List<GeofenceAlert> findByAcknowledgedFalse();

    List<GeofenceAlert> findByInmateIdAndAcknowledgedFalse(String inmateId);
}
