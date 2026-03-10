package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.LicenseRelease;
import com.pms.rehabilitationservice.model.LicenseReleaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LicenseReleaseRepository extends JpaRepository<LicenseRelease, Long> {
    List<LicenseRelease> findByInmateId(String inmateId);

    List<LicenseRelease> findByStatus(LicenseReleaseStatus status);

    List<LicenseRelease> findByStatusIn(List<LicenseReleaseStatus> statuses);
}
