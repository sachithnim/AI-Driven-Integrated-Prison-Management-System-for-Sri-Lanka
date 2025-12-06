package com.pms.rehabilitationservice.repository;

import com.pms.rehabilitationservice.model.RehabProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RehabProfileRepository extends JpaRepository<RehabProfile, Long> {
    Optional<RehabProfile> findByInmateId(String inmateId);
}
