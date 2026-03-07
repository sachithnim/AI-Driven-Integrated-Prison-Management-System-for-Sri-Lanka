package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.RehabProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RehabProfileRepository extends JpaRepository<RehabProfile, Long> {
    Optional<RehabProfile> findByInmateId(String inmateId);

    /** Returns only the inmate IDs of profiles that have already been created. */
    @Query("SELECT r.inmateId FROM RehabProfile r")
    List<String> findAllInmateIds();
}
