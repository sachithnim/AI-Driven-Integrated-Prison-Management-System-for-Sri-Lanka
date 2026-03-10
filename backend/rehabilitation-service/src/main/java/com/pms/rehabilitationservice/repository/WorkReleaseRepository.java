package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.WorkRelease;
import com.pms.rehabilitationservice.model.WorkReleaseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkReleaseRepository extends JpaRepository<WorkRelease, Long> {
    List<WorkRelease> findByInmateId(String inmateId);

    List<WorkRelease> findByStatus(WorkReleaseStatus status);

    List<WorkRelease> findByStatusIn(List<WorkReleaseStatus> statuses);
}
